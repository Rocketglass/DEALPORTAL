/**
 * POST /api/lois/ai-draft
 *
 * Generates an AI-drafted LOI based on application and property/unit data.
 * The broker reviews the draft before sending to the landlord.
 *
 * Body:
 *   applicationId       string — required
 *   propertyId          string — required
 *   unitId              string — required
 *   landlordContactId   string — required
 *
 * Returns: { id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import type { Database, LoiSectionKey, LoiSectionStatus } from '@/types/database';

type LoiInsert = Database['public']['Tables']['lois']['Insert'];

// ---------------------------------------------------------------------------
// Request body
// ---------------------------------------------------------------------------

interface AiDraftBody {
  applicationId: string;
  propertyId: string;
  unitId: string;
  landlordContactId: string;
}

// ---------------------------------------------------------------------------
// Section generation helpers
// ---------------------------------------------------------------------------

interface GeneratedSection {
  section_key: LoiSectionKey;
  section_label: string;
  display_order: number;
  proposed_value: string;
  status: LoiSectionStatus;
}

interface ApplicationData {
  business_name: string;
  agreed_use: string | null;
  desired_term_months: number | null;
  desired_rent_budget: number | null;
  requested_sf: number | null;
  contact_id: string;
}

interface UnitData {
  sf: number;
  marketing_rate: number | null;
  cam_percent: number | null;
  cam_monthly: number | null;
  monthly_rent: number | null;
  rent_per_sqft: number | null;
}

interface PropertyData {
  property_type: string;
  parking_spaces: number | null;
  parking_ratio: number | null;
  total_sf: number | null;
}

/**
 * Build intelligent LOI sections from application + property + unit data.
 */
function generateSections(
  app: ApplicationData,
  unit: UnitData,
  property: PropertyData,
): GeneratedSection[] {
  const sections: GeneratedSection[] = [];
  let order = 0;

  // ---- Base Rent ----
  const monthlyRent = deriveMonthlyRent(app, unit);
  const perSf = monthlyRent && unit.sf ? (monthlyRent / unit.sf).toFixed(2) : null;

  const rentParts: string[] = [];
  if (monthlyRent) rentParts.push(`monthlyAmount: ${formatCurrency(monthlyRent)}`);
  if (perSf) rentParts.push(`perSfRate: ${perSf}`);

  sections.push({
    section_key: 'base_rent',
    section_label: 'Base Rent',
    display_order: ++order,
    proposed_value: rentParts.length > 0
      ? rentParts.join('; ')
      : 'monthlyAmount: TBD',
    status: 'proposed',
  });

  // ---- Term ----
  const termMonths = app.desired_term_months ?? 36;
  const termYears = Math.floor(termMonths / 12);
  const termRemainder = termMonths % 12;
  const termParts = [`years: ${termYears}`];
  if (termRemainder > 0) termParts.push(`months: ${termRemainder}`);

  sections.push({
    section_key: 'term',
    section_label: 'Term',
    display_order: ++order,
    proposed_value: termParts.join('; '),
    status: 'proposed',
  });

  // ---- Tenant Improvements ----
  const tiAllowance = deriveTiAllowance(property.property_type, unit.sf);
  sections.push({
    section_key: 'tenant_improvements',
    section_label: 'Tenant Improvements',
    display_order: ++order,
    proposed_value: `amount: ${formatCurrency(tiAllowance)}; description: Standard TI allowance for ${property.property_type} space; whoPays: landlord`,
    status: 'proposed',
  });

  // ---- CAM ----
  const camParts: string[] = [];
  if (unit.cam_percent) {
    camParts.push(`percentage: ${unit.cam_percent}`);
  }
  camParts.push(`structure: nnn`);
  camParts.push(`baseYear: ${new Date().getFullYear()}`);

  sections.push({
    section_key: 'cam',
    section_label: 'CAM / Operating Expenses',
    display_order: ++order,
    proposed_value: camParts.join('; '),
    status: 'proposed',
  });

  // ---- Security Deposit (2 months rent) ----
  const depositAmount = monthlyRent ? monthlyRent * 2 : null;
  sections.push({
    section_key: 'security_deposit',
    section_label: 'Security Deposit',
    display_order: ++order,
    proposed_value: depositAmount
      ? `amount: ${formatCurrency(depositAmount)}`
      : 'amount: Equal to two (2) months base rent',
    status: 'proposed',
  });

  // ---- Agreed Use ----
  sections.push({
    section_key: 'agreed_use',
    section_label: 'Agreed Use',
    display_order: ++order,
    proposed_value: `description: ${app.agreed_use ?? `General ${property.property_type} use`}`,
    status: 'proposed',
  });

  // ---- Parking ----
  const parkingSpaces = deriveParkingSpaces(property, unit);
  sections.push({
    section_key: 'parking',
    section_label: 'Parking',
    display_order: ++order,
    proposed_value: parkingSpaces
      ? `spaces: ${parkingSpaces}; type: unreserved`
      : 'spaces: Per property standard; type: unreserved',
    status: 'proposed',
  });

  // ---- Escalations (3% annual) ----
  sections.push({
    section_key: 'escalations',
    section_label: 'Rent Escalations',
    display_order: ++order,
    proposed_value: 'annualIncrease: 3; schedule: Annual on anniversary',
    status: 'proposed',
  });

  // ---- Free Rent (1 month for terms >= 36 months) ----
  const freeRentMonths = termMonths >= 36 ? 1 : 0;
  sections.push({
    section_key: 'free_rent',
    section_label: 'Free Rent',
    display_order: ++order,
    proposed_value: freeRentMonths > 0
      ? `months: ${freeRentMonths}; conditions: First month of term`
      : 'months: 0; conditions: None',
    status: 'proposed',
  });

  return sections;
}

// ---------------------------------------------------------------------------
// Derivation helpers
// ---------------------------------------------------------------------------

function deriveMonthlyRent(app: ApplicationData, unit: UnitData): number | null {
  // Prefer unit marketing rate (per SF/month), then tenant budget
  if (unit.marketing_rate && unit.sf) {
    return unit.marketing_rate * unit.sf;
  }
  if (unit.monthly_rent) {
    return unit.monthly_rent;
  }
  if (unit.rent_per_sqft && unit.sf) {
    return unit.rent_per_sqft * unit.sf;
  }
  if (app.desired_rent_budget) {
    return app.desired_rent_budget;
  }
  return null;
}

function deriveTiAllowance(propertyType: string, sf: number): number {
  // Standard TI allowances per SF based on property type
  const tiRates: Record<string, number> = {
    office: 40,
    retail: 25,
    industrial: 10,
    flex: 20,
  };
  const ratePerSf = tiRates[propertyType.toLowerCase()] ?? 15;
  return ratePerSf * sf;
}

function deriveParkingSpaces(
  property: PropertyData,
  unit: UnitData,
): number | null {
  if (property.parking_ratio && unit.sf) {
    // parking_ratio is spaces per 1,000 SF
    return Math.round((property.parking_ratio * unit.sf) / 1000);
  }
  return property.parking_spaces ?? null;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Require broker or admin role
    let user;
    try {
      user = await requireBrokerOrAdminForApi();
    } catch (authError) {
      return NextResponse.json(
        { error: (authError as Error).message },
        { status: 401 },
      );
    }

    const supabase = await createClient();

    const body: AiDraftBody = await request.json();

    // Validate required fields
    const requiredFields: (keyof AiDraftBody)[] = [
      'applicationId',
      'propertyId',
      'unitId',
      'landlordContactId',
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    // Fetch application, property, and unit data in parallel
    const [
      { data: application, error: appError },
      { data: property, error: propError },
      { data: unit, error: unitError },
    ] = await Promise.all([
      supabase
        .from('applications')
        .select(
          'id, contact_id, business_name, agreed_use, desired_term_months, desired_rent_budget, requested_sf, status',
        )
        .eq('id', body.applicationId)
        .single(),
      supabase
        .from('properties')
        .select(
          'id, property_type, parking_spaces, parking_ratio, total_sf',
        )
        .eq('id', body.propertyId)
        .single(),
      supabase
        .from('units')
        .select(
          'id, sf, marketing_rate, cam_percent, cam_monthly, monthly_rent, rent_per_sqft',
        )
        .eq('id', body.unitId)
        .single(),
    ]);

    if (appError || !application) {
      console.error('[POST /api/lois/ai-draft] Application fetch error:', appError);
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 },
      );
    }
    if (propError || !property) {
      console.error('[POST /api/lois/ai-draft] Property fetch error:', propError);
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 },
      );
    }
    if (unitError || !unit) {
      console.error('[POST /api/lois/ai-draft] Unit fetch error:', unitError);
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 },
      );
    }

    // Look up the broker contact for the authenticated user
    const { data: userRecord } = await supabase
      .from('users')
      .select('contact_id')
      .eq('id', user.id)
      .single();

    const brokerContactId = userRecord?.contact_id;
    if (!brokerContactId) {
      return NextResponse.json(
        { error: 'Authenticated user does not have a linked contact record' },
        { status: 400 },
      );
    }

    // Check for property-type templates to use as defaults
    const { data: templates } = await supabase
      .from('loi_templates')
      .select('sections')
      .eq('property_type', property.property_type)
      .eq('is_default', true)
      .maybeSingle();

    // Generate AI-drafted sections
    const generatedSections = generateSections(
      {
        business_name: application.business_name,
        agreed_use: application.agreed_use,
        desired_term_months: application.desired_term_months,
        desired_rent_budget: application.desired_rent_budget,
        requested_sf: application.requested_sf,
        contact_id: application.contact_id,
      },
      {
        sf: unit.sf,
        marketing_rate: unit.marketing_rate,
        cam_percent: unit.cam_percent,
        cam_monthly: unit.cam_monthly,
        monthly_rent: unit.monthly_rent,
        rent_per_sqft: unit.rent_per_sqft,
      },
      {
        property_type: property.property_type,
        parking_spaces: property.parking_spaces,
        parking_ratio: property.parking_ratio,
        total_sf: property.total_sf,
      },
    );

    // Apply template defaults — template values override generated defaults
    // but application-specific data (business name, budget, term) still takes priority
    if (templates?.sections && Array.isArray(templates.sections)) {
      const templateSections = templates.sections as Array<{
        section_key: string;
        section_label?: string;
        default_value?: string;
      }>;

      for (const tmpl of templateSections) {
        const match = generatedSections.find((s) => s.section_key === tmpl.section_key);
        if (match && tmpl.default_value) {
          // Only apply template default if the generated value is a generic placeholder
          const isGeneric = match.proposed_value.includes('TBD') ||
            match.proposed_value.includes('Per property standard');
          if (isGeneric) {
            match.proposed_value = tmpl.default_value;
          }
          // Always use template label if available
          if (tmpl.section_label) {
            match.section_label = tmpl.section_label;
          }
        }
      }
    }

    // Build the AI draft prompt summary for audit/reference
    const aiDraftPrompt = [
      `Application: ${application.business_name} (${body.applicationId})`,
      `Property type: ${property.property_type}`,
      `Unit SF: ${unit.sf.toLocaleString()}`,
      unit.marketing_rate ? `Marketing rate: $${unit.marketing_rate}/SF` : null,
      application.desired_term_months
        ? `Desired term: ${application.desired_term_months} months`
        : null,
      application.desired_rent_budget
        ? `Budget: $${application.desired_rent_budget.toLocaleString()}/mo`
        : null,
      application.agreed_use ? `Agreed use: ${application.agreed_use}` : null,
    ]
      .filter(Boolean)
      .join('; ');

    // Insert the LOI row
    const loiData: LoiInsert = {
      application_id: body.applicationId,
      property_id: body.propertyId,
      unit_id: body.unitId,
      tenant_contact_id: application.contact_id,
      landlord_contact_id: body.landlordContactId,
      broker_contact_id: brokerContactId,
      status: 'draft',
      version: 1,
      created_by: user.id,
      notes: `AI-drafted LOI for ${application.business_name}`,
      ai_drafted: true,
      ai_draft_prompt: aiDraftPrompt,
      parent_loi_id: null,
      sent_at: null,
      expires_at: null,
      agreed_at: null,
    };

    const { data: loi, error: loiError } = await supabase
      .from('lois')
      .insert(loiData)
      .select()
      .single();

    if (loiError) {
      console.error('[POST /api/lois/ai-draft] LOI insert error:', loiError);
      return NextResponse.json({ error: loiError.message }, { status: 500 });
    }

    // Insert all generated sections
    const sectionsWithLoiId = generatedSections.map((s) => ({
      ...s,
      loi_id: loi.id,
    }));

    const { error: sectionsError } = await supabase
      .from('loi_sections')
      .insert(sectionsWithLoiId);

    if (sectionsError) {
      console.error('[POST /api/lois/ai-draft] Sections insert error:', sectionsError);
      // Roll back the LOI row to avoid orphaned records
      await supabase.from('lois').delete().eq('id', loi.id);
      return NextResponse.json({ error: sectionsError.message }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'loi_ai_drafted',
      entity_type: 'loi',
      entity_id: loi.id,
      new_value: {
        application_id: body.applicationId,
        ai_drafted: true,
        sections_generated: generatedSections.length,
      },
    });

    return NextResponse.json({ id: loi.id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/lois/ai-draft] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
