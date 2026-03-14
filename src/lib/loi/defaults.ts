/**
 * Default LOI section values for San Diego East County commercial properties.
 *
 * Provides market-appropriate starting values for all 10 LOI sections,
 * tailored by property type. These defaults accelerate LOI drafting and
 * ensure proposed terms are within market range.
 *
 * Sources: San Diego East County market data, CCIM benchmarks, AIR CRE standards.
 */

// ============================================================
// Types
// ============================================================

/** Supported property types for LOI defaults. */
export type PropertyType = 'industrial' | 'retail' | 'office' | 'flex';

/** Default values for a single LOI section. */
export interface LoiSectionDefault {
  /** Section key matching LoiSectionKey in the database */
  sectionKey: string;
  /** Display label for the section */
  label: string;
  /** Default proposed value (structured text, key:value format) */
  defaultValue: string;
  /** Human-readable note explaining the default */
  marketNote: string;
}

/** Market data for a property type in San Diego East County. */
export interface MarketDefaults {
  propertyType: PropertyType;
  /** Typical base rent range in $/SF/month */
  rentRange: { low: number; high: number };
  /** Typical CAM estimate in $/SF/month */
  camEstimate: number;
  /** Typical property tax estimate in $/SF/month */
  taxEstimate: number;
  /** Typical insurance estimate in $/SF/month */
  insuranceEstimate: number;
  /** Typical TI allowance in $/SF */
  tiAllowance: { low: number; high: number };
  /** Security deposit in months of rent */
  securityDepositMonths: number;
  /** Parking ratio (spaces per 1,000 SF) */
  parkingRatio: number;
  /** Annual escalation rate as a percentage */
  escalationRate: number;
  /** Standard lease term in months */
  standardTermMonths: number;
}

// ============================================================
// Market data — San Diego East County
// ============================================================

const MARKET_DATA: Record<PropertyType, MarketDefaults> = {
  industrial: {
    propertyType: 'industrial',
    rentRange: { low: 1.05, high: 1.65 },
    camEstimate: 0.12,
    taxEstimate: 0.08,
    insuranceEstimate: 0.04,
    tiAllowance: { low: 5, high: 15 },
    securityDepositMonths: 2,
    parkingRatio: 1.0,
    escalationRate: 3,
    standardTermMonths: 60,
  },
  retail: {
    propertyType: 'retail',
    rentRange: { low: 1.75, high: 3.50 },
    camEstimate: 0.25,
    taxEstimate: 0.12,
    insuranceEstimate: 0.06,
    tiAllowance: { low: 15, high: 40 },
    securityDepositMonths: 2,
    parkingRatio: 4.0,
    escalationRate: 3,
    standardTermMonths: 60,
  },
  office: {
    propertyType: 'office',
    rentRange: { low: 1.85, high: 3.25 },
    camEstimate: 0.20,
    taxEstimate: 0.10,
    insuranceEstimate: 0.05,
    tiAllowance: { low: 20, high: 50 },
    securityDepositMonths: 2,
    parkingRatio: 3.5,
    escalationRate: 3,
    standardTermMonths: 60,
  },
  flex: {
    propertyType: 'flex',
    rentRange: { low: 1.25, high: 2.00 },
    camEstimate: 0.15,
    taxEstimate: 0.09,
    insuranceEstimate: 0.04,
    tiAllowance: { low: 10, high: 25 },
    securityDepositMonths: 2,
    parkingRatio: 2.5,
    escalationRate: 3,
    standardTermMonths: 60,
  },
};

// ============================================================
// getMarketDefaults
// ============================================================

/**
 * Get raw market data for a property type.
 *
 * Useful for displaying market comparisons or populating form hints
 * without generating full LOI section text.
 *
 * @param propertyType The type of commercial property
 * @returns Market defaults for the property type
 *
 * @example
 * getMarketDefaults('industrial')
 * // => { rentRange: { low: 1.05, high: 1.65 }, camEstimate: 0.12, ... }
 */
export function getMarketDefaults(propertyType: PropertyType): MarketDefaults {
  return MARKET_DATA[propertyType] ?? MARKET_DATA.industrial;
}

// ============================================================
// getDefaultLoiSections
// ============================================================

/**
 * Generate default LOI section values for all 10 sections based on
 * property type and optional overrides.
 *
 * Returns structured text in key:value format compatible with the LOI
 * section parser in `lease/generate.ts`. Values represent market-standard
 * starting points for San Diego East County commercial properties.
 *
 * @param propertyType The type of commercial property
 * @param overrides    Optional partial overrides for specific values
 * @returns Array of LOI section defaults with market context notes
 *
 * @example
 * const sections = getDefaultLoiSections('industrial');
 * // sections[0] => { sectionKey: 'base_rent', defaultValue: 'monthly_amount: ...' }
 */
export function getDefaultLoiSections(
  propertyType: PropertyType,
  overrides?: {
    sqft?: number;
    monthlyRent?: number;
    termMonths?: number;
  },
): LoiSectionDefault[] {
  const market = getMarketDefaults(propertyType);
  const sqft = overrides?.sqft ?? 2500;
  const midRent = (market.rentRange.low + market.rentRange.high) / 2;
  const monthlyRent = overrides?.monthlyRent ?? Math.round(midRent * sqft * 100) / 100;
  const termMonths = overrides?.termMonths ?? market.standardTermMonths;
  const termYears = Math.floor(termMonths / 12);
  const termRemainderMonths = termMonths % 12;
  const securityDeposit = Math.round(monthlyRent * market.securityDepositMonths * 100) / 100;
  const parkingSpaces = Math.round((sqft / 1000) * market.parkingRatio);
  const nnnTotal = market.camEstimate + market.taxEstimate + market.insuranceEstimate;

  return [
    {
      sectionKey: 'base_rent',
      label: 'Base Rent',
      defaultValue: [
        `monthly_amount: ${formatCurrency(monthlyRent)}`,
        `commencement_date: TBD`,
        `payable_day: 1st`,
      ].join('\n'),
      marketNote: `East County ${propertyType} market: $${market.rentRange.low.toFixed(2)} – $${market.rentRange.high.toFixed(2)}/SF/mo. Default uses midpoint at $${midRent.toFixed(2)}/SF/mo.`,
    },
    {
      sectionKey: 'term',
      label: 'Term',
      defaultValue: [
        `years: ${termYears}`,
        termRemainderMonths > 0 ? `months: ${termRemainderMonths}` : null,
        `commencement_date: TBD`,
      ].filter(Boolean).join('\n'),
      marketNote: `Standard ${propertyType} lease term in East County is ${termMonths / 12} years. Shorter terms (3 yr) common for startups; longer terms (7-10 yr) for credit tenants.`,
    },
    {
      sectionKey: 'tenant_improvements',
      label: 'Tenant Improvements',
      defaultValue: [
        `allowance_per_sf: $${market.tiAllowance.low} - $${market.tiAllowance.high}`,
        `total_estimate: $${formatNumber(market.tiAllowance.low * sqft)} - $${formatNumber(market.tiAllowance.high * sqft)}`,
        `completion: Landlord to deliver vanilla shell; Tenant to complete build-out`,
      ].join('\n'),
      marketNote: `TI allowance for ${propertyType}: $${market.tiAllowance.low} – $${market.tiAllowance.high}/SF. Higher end for second-gen space requiring significant build-out.`,
    },
    {
      sectionKey: 'cam',
      label: 'Common Area Maintenance / Operating Expenses',
      defaultValue: [
        `structure: NNN (Triple Net)`,
        `cam_per_sf: $${market.camEstimate.toFixed(2)}/SF/mo`,
        `tax_per_sf: $${market.taxEstimate.toFixed(2)}/SF/mo`,
        `insurance_per_sf: $${market.insuranceEstimate.toFixed(2)}/SF/mo`,
        `total_nnn_per_sf: $${nnnTotal.toFixed(2)}/SF/mo`,
        `estimated_monthly: ${formatCurrency(nnnTotal * sqft)}`,
      ].join('\n'),
      marketNote: `NNN is standard for ${propertyType} in East County. Total NNN estimated at $${nnnTotal.toFixed(2)}/SF/mo. CAM reconciled annually against actual expenses.`,
    },
    {
      sectionKey: 'security_deposit',
      label: 'Security Deposit',
      defaultValue: [
        `amount: ${formatCurrency(securityDeposit)}`,
        `months: ${market.securityDepositMonths}`,
      ].join('\n'),
      marketNote: `Standard is ${market.securityDepositMonths} months' base rent. May be reduced to 1 month for strong-credit tenants or increased for weaker credits.`,
    },
    {
      sectionKey: 'agreed_use',
      label: 'Agreed Use',
      defaultValue: getDefaultUse(propertyType),
      marketNote: `Use must comply with local zoning. ${propertyType === 'industrial' ? 'East County industrial allows manufacturing, warehouse, distribution, and R&D.' : propertyType === 'retail' ? 'Retail use subject to co-tenancy and exclusivity provisions.' : propertyType === 'office' ? 'General office and professional services.' : 'Flex use allows combination of office, warehouse, and light manufacturing.'}`,
    },
    {
      sectionKey: 'parking',
      label: 'Parking',
      defaultValue: [
        `spaces: ${parkingSpaces}`,
        `ratio: ${market.parkingRatio} per 1,000 SF`,
        `type: unreserved`,
        `cost: included`,
      ].join('\n'),
      marketNote: `Standard ${propertyType} parking ratio: ${market.parkingRatio} spaces per 1,000 SF. Industrial typically lower; office and retail higher.`,
    },
    {
      sectionKey: 'options',
      label: 'Options',
      defaultValue: [
        `renewal_options: One (1) option to renew for five (5) years`,
        `renewal_notice: 180 days written notice prior to expiration`,
        `renewal_rate: Fair market value at time of renewal, with floor of expiring rate`,
        `expansion_rights: Right of first offer on adjacent space`,
      ].join('\n'),
      marketNote: `One 5-year renewal option is standard. ROFO/ROFR on adjacent space negotiable based on landlord flexibility and building occupancy.`,
    },
    {
      sectionKey: 'escalations',
      label: 'Rent Escalations',
      defaultValue: [
        `annual_increase: ${market.escalationRate}%`,
        `frequency: Annual`,
        `effective: On each anniversary of the commencement date`,
      ].join('\n'),
      marketNote: `${market.escalationRate}% annual increases are market standard in East County. Some landlords accept CPI-based escalations with a cap.`,
    },
    {
      sectionKey: 'free_rent',
      label: 'Free Rent',
      defaultValue: [
        `months: ${getFreeRentDefault(termMonths)}`,
        `timing: First ${getFreeRentDefault(termMonths)} month(s) following commencement`,
        `conditions: Base rent only; tenant responsible for NNN charges during free rent period`,
      ].join('\n'),
      marketNote: `Free rent of ${getFreeRentDefault(termMonths)} month(s) is typical for a ${termMonths / 12}-year ${propertyType} lease. Longer terms warrant more concession.`,
    },
  ];
}

// ============================================================
// Internal helpers
// ============================================================

/** Get default use description based on property type. */
function getDefaultUse(propertyType: PropertyType): string {
  switch (propertyType) {
    case 'industrial':
      return 'General industrial: warehousing, distribution, light manufacturing, and ancillary office use, subject to applicable zoning and all governmental requirements.';
    case 'retail':
      return 'Retail sales and related services, subject to applicable zoning, all governmental requirements, and any exclusive use provisions in the shopping center.';
    case 'office':
      return 'General office and professional services use, subject to applicable zoning and all governmental requirements.';
    case 'flex':
      return 'Flex use: combination of office, light assembly, research and development, and warehousing, subject to applicable zoning and all governmental requirements.';
    default:
      return 'Subject to applicable zoning and all governmental requirements.';
  }
}

/** Get default free rent months based on term length. */
function getFreeRentDefault(termMonths: number): number {
  if (termMonths <= 24) return 0;
  if (termMonths <= 36) return 1;
  if (termMonths <= 60) return 2;
  if (termMonths <= 84) return 3;
  return Math.min(6, Math.floor(termMonths / 24));
}

/** Format a number as USD currency string. */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a number with comma separators. */
function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(n);
}
