import type {
  Lease,
  LoiSection,
  LoiSectionKey,
  RentEscalation,
  Contact,
  Property,
  Unit,
} from '@/types/database';

// ============================================================
// Types
// ============================================================

export interface LeaseMetadata {
  property: Property;
  unit: Unit;
  tenant: Contact;
  landlord: Contact;
  broker: Contact;
  guarantor?: Contact | null;
  formType?: string;
  formVersion?: string;
}

type LeaseInsert = Omit<Lease, 'id' | 'created_at' | 'updated_at'> & { id?: string };
type EscalationInsert = Omit<RentEscalation, 'id'> & { id?: string };

// ============================================================
// Helpers
// ============================================================

/** Find a section by key and return its agreed (or proposed) value. */
function sectionValue(sections: LoiSection[], key: LoiSectionKey): string | null {
  const section = sections.find((s) => s.section_key === key);
  if (!section) return null;
  return section.agreed_value ?? section.proposed_value ?? null;
}

/** Parse a number from a possibly comma-formatted string. */
function parseNum(val: string | null | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.\-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/** Parse an integer from a string. */
function parseInt10(val: string | null | undefined): number {
  if (!val) return 0;
  const n = parseInt(val.replace(/[^0-9\-]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

/** Parse a simple key:value block (one per line or semicolon-separated). */
function parseKeyValue(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Support both newlines and semicolons as delimiters
  const lines = text.split(/[;\n]/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase().replace(/\s+/g, '_');
    const value = line.slice(colonIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

/** Add months to a date string (YYYY-MM-DD), returning YYYY-MM-DD. */
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Subtract one day from a date string (YYYY-MM-DD). */
function subtractOneDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Build a full name from a contact. */
function contactFullName(c: Contact): string {
  const parts = [c.first_name, c.last_name].filter(Boolean);
  return parts.join(' ') || c.company_name || '';
}

/** Build a display name: company name or entity name for the lease party. */
function partyName(c: Contact): string {
  return c.company_name || c.dba_name || contactFullName(c);
}

// ============================================================
// mapLoiToLease
// ============================================================

/**
 * Maps an array of agreed LOI sections and metadata to a Lease insert object
 * with all AIR form fields populated.
 *
 * Returns { lease, escalations, populatedCount } where populatedCount
 * is the number of AIR sections that were auto-populated.
 */
export function mapLoiToLease(
  sections: LoiSection[],
  metadata: LeaseMetadata,
): {
  lease: LeaseInsert;
  escalations: EscalationInsert[];
  populatedCount: number;
} {
  const { property, unit, tenant, landlord, broker, guarantor } = metadata;

  // ---- Parse each LOI section ----

  // Base Rent
  const baseRentRaw = sectionValue(sections, 'base_rent') || '';
  const baseRentParsed = parseKeyValue(baseRentRaw);
  const baseRentMonthly =
    parseNum(baseRentParsed['monthly_amount'] || baseRentParsed['monthly']) ||
    parseNum(baseRentRaw);
  const baseRentCommencement =
    baseRentParsed['commencement_date'] || baseRentParsed['commencement'] || null;
  const baseRentPayableDay = baseRentParsed['payable_day'] || '1st';

  // Term
  const termRaw = sectionValue(sections, 'term') || '';
  const termParsed = parseKeyValue(termRaw);
  const termYears = parseInt10(termParsed['years'] || termParsed['term_years']);
  const termMonthsExtra = parseInt10(termParsed['months'] || termParsed['term_months']);
  const commencementDate =
    termParsed['commencement_date'] || termParsed['commencement'] || '';

  // Calculate total term in months and expiration date
  const totalTermMonths = termYears * 12 + termMonthsExtra;
  let expirationDate = termParsed['expiration_date'] || termParsed['expiration'] || '';
  if (!expirationDate && commencementDate && totalTermMonths > 0) {
    expirationDate = subtractOneDay(addMonths(commencementDate, totalTermMonths));
  }

  // Tenant Improvements
  const tiRaw = sectionValue(sections, 'tenant_improvements') || '';

  // CAM
  const camRaw = sectionValue(sections, 'cam') || '';
  const camParsed = parseKeyValue(camRaw);
  const camPercent = parseNum(camParsed['percentage'] || camParsed['percent']) || null;
  const camDescription =
    camParsed['description'] || camParsed['structure'] || camRaw || '';

  // Security Deposit
  const sdRaw = sectionValue(sections, 'security_deposit') || '';
  const sdParsed = parseKeyValue(sdRaw);
  const securityDeposit = parseNum(sdParsed['amount']) || parseNum(sdRaw);

  // Agreed Use
  const agreedUse = sectionValue(sections, 'agreed_use') || null;

  // Parking
  const parkingRaw = sectionValue(sections, 'parking') || '';
  const parkingParsed = parseKeyValue(parkingRaw);
  const parkingSpaces = parseInt10(parkingParsed['spaces']) || property.parking_spaces || null;
  const parkingType = parkingParsed['type'] || 'unreserved';

  // Escalations
  const escalationsRaw = sectionValue(sections, 'escalations') || '';
  const escalationsParsed = parseKeyValue(escalationsRaw);
  const annualIncrease = parseNum(
    escalationsParsed['annual_increase'] || escalationsParsed['increase'],
  );

  // Build escalation schedule
  let escalations: EscalationInsert[] = [];
  if (commencementDate && totalTermMonths > 0 && unit.sf > 0) {
    escalations = calculateEscalationSchedule(
      baseRentMonthly,
      totalTermMonths,
      annualIncrease || 3, // default 3% if not specified
      commencementDate,
      unit.sf,
    );
  }

  // ---- Section 1.7: Monies upon execution ----
  // First month's CAM estimate (using unit cam_monthly or a rough calculation)
  const execCamAmount = unit.cam_monthly ?? 0;
  const execBaseRent = baseRentMonthly;
  const execSecurityDeposit = securityDeposit || baseRentMonthly * 2;
  const totalDueUponExecution = execBaseRent + execCamAmount + execSecurityDeposit;

  // ---- Count populated sections ----
  const sectionKeys: LoiSectionKey[] = [
    'base_rent',
    'term',
    'tenant_improvements',
    'cam',
    'security_deposit',
    'agreed_use',
    'parking',
    'escalations',
  ];
  let populatedCount = 0;
  for (const key of sectionKeys) {
    if (sectionValue(sections, key)) populatedCount++;
  }
  // Always count parties (1.1), premises (1.2a/b), monies (1.7), insuring (1.9), brokers (1.10)
  populatedCount += 5;

  // ---- Build lease object ----

  const lease: LeaseInsert = {
    loi_id: sections[0]?.loi_id || null,
    property_id: property.id,
    unit_id: unit.id,
    tenant_contact_id: tenant.id,
    landlord_contact_id: landlord.id,
    broker_contact_id: broker.id,
    guarantor_contact_id: guarantor?.id || null,
    status: 'draft',
    form_type: metadata.formType || 'AIR-NNN',
    form_version: metadata.formVersion || '2024 Rev.',
    reference_date: new Date().toISOString().slice(0, 10),

    // Section 1.1 — Parties
    lessor_name: partyName(landlord),
    lessor_entity_type: landlord.entity_type || null,
    lessee_name: partyName(tenant),
    lessee_entity_type: tenant.entity_type || null,

    // Section 1.2(a) — Premises
    premises_address: `${property.address}, Suite ${unit.suite_number}`,
    premises_city: property.city,
    premises_county: property.county || null,
    premises_state: property.state,
    premises_zip: property.zip || null,
    premises_sf: unit.sf,
    premises_description: `Approximately ${new Intl.NumberFormat('en-US').format(unit.sf)} rentable square feet as outlined on the attached Site Plan.`,

    // Section 1.2(b) — Parking
    parking_spaces: parkingSpaces,
    parking_type: parkingType,

    // Section 1.3 — Term
    term_years: termYears || null,
    term_months: termMonthsExtra || null,
    commencement_date: commencementDate,
    expiration_date: expirationDate,

    // Section 1.4 — Early Possession
    early_possession_terms: tiRaw || null,

    // Section 1.5 — Base Rent
    base_rent_monthly: baseRentMonthly,
    base_rent_payable_day: baseRentPayableDay,
    base_rent_commencement: baseRentCommencement || commencementDate || null,

    // Section 1.6 — CAM
    cam_percent: camPercent,
    cam_description: camDescription,

    // Section 1.7 — Monies due upon execution
    exec_base_rent_amount: execBaseRent,
    exec_base_rent_period: 'month',
    exec_cam_amount: execCamAmount || null,
    exec_cam_period: execCamAmount ? 'month' : null,
    exec_security_deposit: execSecurityDeposit,
    exec_other_amount: null,
    exec_other_description: null,
    total_due_upon_execution: totalDueUponExecution,

    // Section 1.8 — Agreed Use
    agreed_use: agreedUse,

    // Section 1.9 — Insuring Party
    insuring_party: 'Lessee',

    // Section 1.10 — Brokers
    broker_representation_type: 'dual',
    lessors_broker_name: contactFullName(broker),
    lessors_broker_company: broker.company_name || null,
    lessees_broker_name: contactFullName(broker),
    lessees_broker_company: broker.company_name || null,
    broker_payment_terms:
      'Per separate commission agreement between Lessor and Broker.',

    // Section 1.11 — Guarantor
    guarantor_names: guarantor ? contactFullName(guarantor) + ', individually' : null,

    // Section 1.12 — Attachments
    addendum_paragraph_start: 51,
    addendum_paragraph_end: null,
    has_site_plan_premises: true,
    has_site_plan_project: true,
    has_rules_and_regulations: true,
    other_attachments: null,

    // Security
    security_deposit: execSecurityDeposit,

    // DocuSign (empty until sent)
    docusign_envelope_id: null,
    docusign_status: null,
    sent_for_signature_at: null,
    signed_date: null,
    lease_pdf_url: null,
    executed_pdf_url: null,
  };

  return { lease, escalations, populatedCount };
}

// ============================================================
// calculateEscalationSchedule
// ============================================================

/**
 * Calculate a rent escalation schedule based on an annual percentage increase.
 *
 * @param baseRent      Monthly base rent for year 1
 * @param termMonths    Total lease term in months
 * @param annualIncrease Annual increase percentage (e.g. 3 for 3%)
 * @param commencementDate Lease commencement date (YYYY-MM-DD)
 * @param premisesSf    Premises square footage (for $/SF calculation)
 * @returns Array of RentEscalation insert objects (without lease_id set)
 */
export function calculateEscalationSchedule(
  baseRent: number,
  termMonths: number,
  annualIncrease: number,
  commencementDate: string,
  premisesSf: number,
): EscalationInsert[] {
  const escalations: EscalationInsert[] = [];
  const totalYears = Math.ceil(termMonths / 12);
  const multiplier = 1 + annualIncrease / 100;

  for (let year = 1; year <= totalYears; year++) {
    const monthlyAmount = baseRent * Math.pow(multiplier, year - 1);
    const roundedMonthly = Math.round(monthlyAmount * 100) / 100;
    const rentPerSqft = premisesSf > 0 ? Math.round((roundedMonthly / premisesSf) * 100) / 100 : 0;
    const effectiveDate =
      year === 1
        ? commencementDate
        : addMonths(commencementDate, (year - 1) * 12);

    escalations.push({
      lease_id: '', // to be set when creating
      year_number: year,
      effective_date: effectiveDate,
      rent_per_sqft: rentPerSqft,
      monthly_amount: roundedMonthly,
      notes: year === 1 ? 'Base year' : `${annualIncrease}% annual increase`,
    });
  }

  return escalations;
}

// ============================================================
// calculateTotalConsideration
// ============================================================

/**
 * Calculate the total lease consideration (sum of all monthly rents across
 * the full term, accounting for escalations if provided).
 *
 * If no escalations are provided, uses flat base rent for the entire term.
 */
export function calculateTotalConsideration(
  baseRent: number,
  termMonths: number,
  escalations?: EscalationInsert[],
): number {
  if (!escalations || escalations.length === 0) {
    return baseRent * termMonths;
  }

  let total = 0;

  for (let i = 0; i < escalations.length; i++) {
    const esc = escalations[i];
    const isLastYear = i === escalations.length - 1;

    // Determine how many months this year's rate applies
    let monthsAtThisRate: number;
    if (isLastYear) {
      // Remaining months in the term
      const monthsUsed = i * 12;
      monthsAtThisRate = termMonths - monthsUsed;
    } else {
      monthsAtThisRate = 12;
    }

    // Clamp to avoid negative
    monthsAtThisRate = Math.max(0, monthsAtThisRate);
    total += esc.monthly_amount * monthsAtThisRate;
  }

  return Math.round(total * 100) / 100;
}
