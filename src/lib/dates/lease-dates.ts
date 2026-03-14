/**
 * Date utility functions for commercial lease management.
 *
 * Pure functions for calculating term durations, expiration dates,
 * escalation schedules, and formatted date displays. All date inputs
 * accept YYYY-MM-DD strings (consistent with the database schema).
 */

// ============================================================
// Types
// ============================================================

export interface RemainingTerm {
  /** Full months remaining */
  months: number;
  /** Additional days beyond full months */
  days: number;
  /** Total days remaining */
  totalDays: number;
  /** Whether the lease has already expired */
  isExpired: boolean;
}

// ============================================================
// calculateTermMonths
// ============================================================

/**
 * Calculate the number of months between two dates.
 *
 * Uses calendar-month calculation (not 30-day periods). Partial months
 * at the end are included as a full month if the remaining days exceed
 * 15, matching standard commercial lease conventions.
 *
 * @param startDate Lease start date (YYYY-MM-DD)
 * @param endDate   Lease end date (YYYY-MM-DD)
 * @returns Number of months (rounded to nearest whole month)
 *
 * @example
 * calculateTermMonths('2026-04-01', '2029-03-31') // => 36
 * calculateTermMonths('2026-04-01', '2026-10-15') // => 7
 */
export function calculateTermMonths(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (end <= start) return 0;

  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const dayDiff = end.getDate() - start.getDate();

  let months = yearDiff * 12 + monthDiff;

  // If the end day is before the start day, we haven't completed the last month
  if (dayDiff < 0) {
    months -= 1;
    // Check if the remaining partial month is more than half
    const daysInEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
    const remainingDays = daysInEndMonth + dayDiff;
    if (remainingDays > 15) {
      months += 1;
    }
  } else if (dayDiff > 0) {
    // Partial month at the end — round up if > 15 days
    if (dayDiff > 15) {
      months += 1;
    }
  }

  return Math.max(0, months);
}

// ============================================================
// calculateExpirationDate
// ============================================================

/**
 * Calculate the lease expiration date by adding months to a start date.
 *
 * The expiration is one day before the anniversary of the commencement
 * date, following standard AIR CRE lease conventions.
 * E.g., a 36-month lease starting April 1, 2026 expires March 31, 2029.
 *
 * @param startDate  Lease commencement date (YYYY-MM-DD)
 * @param termMonths Lease term in months
 * @returns Expiration date as YYYY-MM-DD string
 *
 * @example
 * calculateExpirationDate('2026-04-01', 36) // => '2029-03-31'
 * calculateExpirationDate('2026-01-15', 12) // => '2027-01-14'
 */
export function calculateExpirationDate(startDate: string, termMonths: number): string {
  if (termMonths <= 0) return startDate;

  const start = parseDate(startDate);
  // Add termMonths, then subtract one day
  start.setMonth(start.getMonth() + termMonths);
  start.setDate(start.getDate() - 1);

  return formatDateISO(start);
}

// ============================================================
// getEscalationDates
// ============================================================

/**
 * Generate an array of dates when rent escalations take effect.
 *
 * Escalations typically occur on lease anniversaries (every 12 months)
 * but some leases use different frequencies (e.g., every 6 months for
 * shorter-term retail leases).
 *
 * The first date in the returned array is the commencement date itself
 * (when the initial rate begins).
 *
 * @param startDate                  Lease commencement date (YYYY-MM-DD)
 * @param termMonths                 Total lease term in months
 * @param escalationFrequencyMonths  Months between escalations (default: 12)
 * @returns Array of YYYY-MM-DD date strings
 *
 * @example
 * getEscalationDates('2026-04-01', 36, 12)
 * // => ['2026-04-01', '2027-04-01', '2028-04-01']
 */
export function getEscalationDates(
  startDate: string,
  termMonths: number,
  escalationFrequencyMonths: number = 12,
): string[] {
  if (termMonths <= 0 || escalationFrequencyMonths <= 0) return [];

  const dates: string[] = [startDate];
  let monthsElapsed = escalationFrequencyMonths;

  while (monthsElapsed < termMonths) {
    const d = parseDate(startDate);
    d.setMonth(d.getMonth() + monthsElapsed);
    dates.push(formatDateISO(d));
    monthsElapsed += escalationFrequencyMonths;
  }

  return dates;
}

// ============================================================
// isLeaseExpiringSoon
// ============================================================

/**
 * Check whether a lease is expiring within a given threshold.
 *
 * Useful for dashboard alerts and notification triggers. A lease that
 * has already expired also returns true.
 *
 * @param expirationDate Lease expiration date (YYYY-MM-DD)
 * @param thresholdDays  Number of days before expiration to flag (default: 180)
 * @returns True if the lease expires within the threshold or has already expired
 *
 * @example
 * // Assuming today is 2026-03-14
 * isLeaseExpiringSoon('2026-06-30', 180) // => true  (108 days away)
 * isLeaseExpiringSoon('2027-01-01', 180) // => false (293 days away)
 * isLeaseExpiringSoon('2026-01-01', 180) // => true  (already expired)
 */
export function isLeaseExpiringSoon(
  expirationDate: string,
  thresholdDays: number = 180,
): boolean {
  const expiration = parseDate(expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = expiration.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / MS_PER_DAY);

  return diffDays <= thresholdDays;
}

// ============================================================
// getRemainingTerm
// ============================================================

/**
 * Calculate the remaining term of a lease from today.
 *
 * Returns months, extra days, total days, and whether the lease has expired.
 *
 * @param expirationDate Lease expiration date (YYYY-MM-DD)
 * @returns Remaining term breakdown
 *
 * @example
 * // Assuming today is 2026-03-14
 * getRemainingTerm('2028-03-31')
 * // => { months: 24, days: 17, totalDays: 748, isExpired: false }
 */
export function getRemainingTerm(expirationDate: string): RemainingTerm {
  const expiration = parseDate(expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = expiration.getTime() - today.getTime();
  const totalDays = Math.ceil(diffMs / MS_PER_DAY);

  if (totalDays <= 0) {
    return { months: 0, days: 0, totalDays: Math.max(0, totalDays), isExpired: true };
  }

  // Calculate full months remaining
  let months = 0;
  const cursor = new Date(today);
  while (true) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    if (next > expiration) break;
    months++;
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Remaining days after full months
  const days = Math.ceil((expiration.getTime() - cursor.getTime()) / MS_PER_DAY);

  return {
    months,
    days: Math.max(0, days),
    totalDays,
    isExpired: false,
  };
}

// ============================================================
// formatLeaseTermDisplay
// ============================================================

/**
 * Format a lease term as a human-readable display string.
 *
 * Produces a concise summary suitable for UI display in the broker
 * dashboard and lease detail pages.
 *
 * @param startDate Lease commencement date (YYYY-MM-DD)
 * @param endDate   Lease expiration date (YYYY-MM-DD)
 * @returns Formatted string like "Mar 2026 - Feb 2029 (36 months)"
 *
 * @example
 * formatLeaseTermDisplay('2026-04-01', '2029-03-31')
 * // => 'Apr 2026 – Mar 2029 (36 months)'
 */
export function formatLeaseTermDisplay(startDate: string, endDate: string): string {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  const startFormatted = formatMonthYear(start);
  const endFormatted = formatMonthYear(end);
  const months = calculateTermMonths(startDate, endDate);

  const monthLabel = months === 1 ? 'month' : 'months';
  return `${startFormatted} \u2013 ${endFormatted} (${months} ${monthLabel})`;
}

// ============================================================
// Internal helpers
// ============================================================

const MS_PER_DAY = 86_400_000;

/** Parse a YYYY-MM-DD string into a local Date (midnight). */
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/** Format a Date as YYYY-MM-DD. */
function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Format a Date as "Mon YYYY" (e.g. "Apr 2026"). */
function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
