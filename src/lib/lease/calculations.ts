/**
 * Comprehensive lease financial calculations.
 *
 * Pure functions for computing effective rent, price per square foot,
 * total lease value, NNN estimates, TI amortization, and pro-rated rent.
 * All amounts are rounded to 2 decimal places for currency precision.
 */

// ============================================================
// Types
// ============================================================

export interface PricePerSqFt {
  /** Price per square foot per month */
  perMonth: number;
  /** Price per square foot per year */
  perYear: number;
}

export interface EscalationInput {
  /** Monthly rent amount for this period */
  monthlyAmount: number;
  /** Number of months this rate applies */
  months: number;
}

export interface NNNEstimate {
  /** Base rent per month */
  baseRent: number;
  /** CAM charges per month */
  camMonthly: number;
  /** Property tax per month */
  taxMonthly: number;
  /** Insurance per month */
  insuranceMonthly: number;
  /** Total NNN monthly cost */
  totalMonthly: number;
  /** Total NNN annual cost */
  totalAnnual: number;
  /** NNN charges only (excluding base rent) per SF/month */
  nnnPerSqftMonth: number;
  /** All-in cost per SF/month */
  allInPerSqftMonth: number;
}

export interface TIAmortization {
  /** Total TI allowance amount */
  totalAllowance: number;
  /** Monthly amortization payment */
  monthlyPayment: number;
  /** Total amount paid over the term (principal + interest) */
  totalCost: number;
  /** Total interest paid */
  totalInterest: number;
}

export interface ProRatedRent {
  /** Number of days in the move-in month */
  daysInMonth: number;
  /** Number of days the tenant occupies */
  occupiedDays: number;
  /** Pro-rated rent amount for the first partial month */
  proRatedAmount: number;
  /** Daily rent rate used for calculation */
  dailyRate: number;
}

// ============================================================
// calculateEffectiveRent
// ============================================================

/**
 * Calculate effective monthly rent after accounting for free rent months.
 *
 * Spreads the cost of free rent evenly across the entire lease term so that
 * the effective rate reflects the true monthly cost to the tenant.
 *
 * @param baseRent       Monthly base rent amount
 * @param freeRentMonths Number of months of free rent granted
 * @param termMonths     Total lease term in months (including free rent period)
 * @returns Effective monthly rent after free rent concession
 *
 * @example
 * // 36-month lease at $5,000/mo with 3 months free
 * calculateEffectiveRent(5000, 3, 36) // => 4583.33
 */
export function calculateEffectiveRent(
  baseRent: number,
  freeRentMonths: number,
  termMonths: number,
): number {
  if (termMonths <= 0) return 0;
  if (freeRentMonths < 0) freeRentMonths = 0;
  if (freeRentMonths >= termMonths) return 0;

  const payingMonths = termMonths - freeRentMonths;
  const totalRent = baseRent * payingMonths;
  return round2(totalRent / termMonths);
}

// ============================================================
// calculatePricePerSqFt
// ============================================================

/**
 * Calculate price per square foot on both a monthly and annual basis.
 *
 * Standard commercial real estate metric used for comparing lease rates
 * across different-sized spaces.
 *
 * @param monthlyRent Monthly rent amount
 * @param sqft        Rentable square footage
 * @returns Object with perMonth and perYear rates
 *
 * @example
 * calculatePricePerSqFt(5000, 2500) // => { perMonth: 2.00, perYear: 24.00 }
 */
export function calculatePricePerSqFt(
  monthlyRent: number,
  sqft: number,
): PricePerSqFt {
  if (sqft <= 0) return { perMonth: 0, perYear: 0 };

  const perMonth = round2(monthlyRent / sqft);
  const perYear = round2(perMonth * 12);
  return { perMonth, perYear };
}

// ============================================================
// calculateLeaseValue
// ============================================================

/**
 * Calculate total lease value over the entire term, accounting for
 * rent escalations if provided.
 *
 * When escalations are provided, each entry specifies the monthly amount
 * and how many months that rate applies. When omitted, flat rent is assumed.
 *
 * @param monthlyRent  Base monthly rent (used when no escalations provided)
 * @param termMonths   Total lease term in months
 * @param escalations  Optional array of escalation periods
 * @returns Total lease value over the full term
 *
 * @example
 * // Flat rent
 * calculateLeaseValue(5000, 36) // => 180000
 *
 * // With escalations
 * calculateLeaseValue(5000, 36, [
 *   { monthlyAmount: 5000, months: 12 },
 *   { monthlyAmount: 5150, months: 12 },
 *   { monthlyAmount: 5304.50, months: 12 },
 * ]) // => 185454
 */
export function calculateLeaseValue(
  monthlyRent: number,
  termMonths: number,
  escalations?: EscalationInput[],
): number {
  if (termMonths <= 0) return 0;

  if (!escalations || escalations.length === 0) {
    return round2(monthlyRent * termMonths);
  }

  let total = 0;
  for (const esc of escalations) {
    const months = Math.max(0, esc.months);
    total += esc.monthlyAmount * months;
  }

  return round2(total);
}

// ============================================================
// calculateNNNEstimate
// ============================================================

/**
 * Calculate the full NNN (triple-net) cost estimate for a lease.
 *
 * In a NNN lease, the tenant pays base rent plus their share of CAM
 * (common area maintenance), property taxes, and insurance. This is the
 * standard structure for industrial and many retail leases in San Diego
 * East County.
 *
 * @param baseRent          Monthly base rent
 * @param camPerSqft        CAM charges per SF per month
 * @param taxPerSqft        Property tax per SF per month
 * @param insurancePerSqft  Insurance per SF per month
 * @param sqft              Rentable square footage
 * @returns Full NNN cost breakdown
 *
 * @example
 * calculateNNNEstimate(5000, 0.15, 0.10, 0.05, 2500)
 * // => { baseRent: 5000, camMonthly: 375, taxMonthly: 250, ... totalMonthly: 5625 }
 */
export function calculateNNNEstimate(
  baseRent: number,
  camPerSqft: number,
  taxPerSqft: number,
  insurancePerSqft: number,
  sqft: number,
): NNNEstimate {
  const camMonthly = round2(camPerSqft * sqft);
  const taxMonthly = round2(taxPerSqft * sqft);
  const insuranceMonthly = round2(insurancePerSqft * sqft);
  const nnnCharges = camMonthly + taxMonthly + insuranceMonthly;
  const totalMonthly = round2(baseRent + nnnCharges);
  const totalAnnual = round2(totalMonthly * 12);
  const nnnPerSqftMonth = sqft > 0 ? round2(nnnCharges / sqft) : 0;
  const allInPerSqftMonth = sqft > 0 ? round2(totalMonthly / sqft) : 0;

  return {
    baseRent,
    camMonthly,
    taxMonthly,
    insuranceMonthly,
    totalMonthly,
    totalAnnual,
    nnnPerSqftMonth,
    allInPerSqftMonth,
  };
}

// ============================================================
// calculateTIAmortization
// ============================================================

/**
 * Calculate monthly tenant improvement (TI) amortization.
 *
 * When a landlord provides a TI allowance, the cost is often amortized
 * into the rent over the lease term at an agreed interest rate. This
 * computes the monthly payment using a standard amortization formula.
 *
 * @param tiAllowance  TI allowance per square foot ($/SF)
 * @param sqft         Rentable square footage
 * @param termMonths   Lease term in months
 * @param interestRate Annual interest rate as a percentage (e.g. 8 for 8%)
 * @returns TI amortization breakdown
 *
 * @example
 * // $15/SF TI on 2,500 SF over 60 months at 8%
 * calculateTIAmortization(15, 2500, 60, 8)
 * // => { totalAllowance: 37500, monthlyPayment: 760.93, ... }
 */
export function calculateTIAmortization(
  tiAllowance: number,
  sqft: number,
  termMonths: number,
  interestRate: number,
): TIAmortization {
  const totalAllowance = round2(tiAllowance * sqft);

  if (termMonths <= 0 || totalAllowance <= 0) {
    return {
      totalAllowance,
      monthlyPayment: 0,
      totalCost: 0,
      totalInterest: 0,
    };
  }

  // If interest rate is 0, simple division
  if (interestRate <= 0) {
    const monthlyPayment = round2(totalAllowance / termMonths);
    return {
      totalAllowance,
      monthlyPayment,
      totalCost: round2(monthlyPayment * termMonths),
      totalInterest: 0,
    };
  }

  // Standard amortization: M = P * [r(1+r)^n] / [(1+r)^n - 1]
  const monthlyRate = interestRate / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const monthlyPayment = round2(totalAllowance * (monthlyRate * factor) / (factor - 1));
  const totalCost = round2(monthlyPayment * termMonths);
  const totalInterest = round2(totalCost - totalAllowance);

  return {
    totalAllowance,
    monthlyPayment,
    totalCost,
    totalInterest,
  };
}

// ============================================================
// calculateProRatedRent
// ============================================================

/**
 * Calculate pro-rated rent for a partial first month.
 *
 * When a tenant moves in mid-month, rent is pro-rated based on the
 * number of remaining days in the move-in month.
 *
 * @param monthlyRent Monthly rent amount
 * @param moveInDate  Move-in date (YYYY-MM-DD string or Date)
 * @returns Pro-rated rent breakdown for the first partial month
 *
 * @example
 * calculateProRatedRent(5000, '2026-04-15')
 * // => { daysInMonth: 30, occupiedDays: 16, proRatedAmount: 2666.67, dailyRate: 166.67 }
 */
export function calculateProRatedRent(
  monthlyRent: number,
  moveInDate: string | Date,
): ProRatedRent {
  const date = typeof moveInDate === 'string'
    ? new Date(moveInDate + 'T00:00:00')
    : moveInDate;

  const year = date.getFullYear();
  const month = date.getMonth();
  const dayOfMonth = date.getDate();

  // Total days in the move-in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Days from move-in through end of month (inclusive)
  const occupiedDays = daysInMonth - dayOfMonth + 1;

  const dailyRate = round2(monthlyRent / daysInMonth);
  const proRatedAmount = round2(dailyRate * occupiedDays);

  return {
    daysInMonth,
    occupiedDays,
    proRatedAmount,
    dailyRate,
  };
}

// ============================================================
// Internal helpers
// ============================================================

/** Round a number to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
