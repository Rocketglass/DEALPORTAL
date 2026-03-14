import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  calculateTermMonths,
  calculateExpirationDate,
  getEscalationDates,
  isLeaseExpiringSoon,
  getRemainingTerm,
  formatLeaseTermDisplay,
} from '../lease-dates';

// ============================================================
// calculateTermMonths
// ============================================================

describe('calculateTermMonths', () => {
  it('calculates exact 3-year term', () => {
    expect(calculateTermMonths('2026-04-01', '2029-03-31')).toBe(36);
  });

  it('calculates a 1-year term', () => {
    expect(calculateTermMonths('2026-01-01', '2026-12-31')).toBe(12);
  });

  it('returns 0 when end equals start', () => {
    expect(calculateTermMonths('2026-04-01', '2026-04-01')).toBe(0);
  });

  it('returns 0 when end is before start', () => {
    expect(calculateTermMonths('2029-04-01', '2026-04-01')).toBe(0);
  });

  it('rounds up partial months over 15 days', () => {
    // Apr 1 to Oct 20 = 6 months + 19 days -> rounds to 7
    expect(calculateTermMonths('2026-04-01', '2026-10-20')).toBe(7);
  });

  it('does not round up partial months of 15 days or fewer', () => {
    // Apr 1 to Oct 10 = 6 months + 9 days -> stays at 6
    expect(calculateTermMonths('2026-04-01', '2026-10-10')).toBe(6);
  });

  it('handles 5-year term', () => {
    expect(calculateTermMonths('2026-04-01', '2031-03-31')).toBe(60);
  });
});

// ============================================================
// calculateExpirationDate
// ============================================================

describe('calculateExpirationDate', () => {
  it('calculates expiration for a 36-month lease', () => {
    expect(calculateExpirationDate('2026-04-01', 36)).toBe('2029-03-31');
  });

  it('calculates expiration for a 12-month lease', () => {
    expect(calculateExpirationDate('2026-01-15', 12)).toBe('2027-01-14');
  });

  it('returns start date when term is 0', () => {
    expect(calculateExpirationDate('2026-04-01', 0)).toBe('2026-04-01');
  });

  it('returns start date when term is negative', () => {
    expect(calculateExpirationDate('2026-04-01', -5)).toBe('2026-04-01');
  });

  it('handles 60-month lease', () => {
    expect(calculateExpirationDate('2026-04-01', 60)).toBe('2031-03-31');
  });

  it('handles month-end start dates', () => {
    expect(calculateExpirationDate('2026-01-31', 1)).toBe('2026-03-02');
  });
});

// ============================================================
// getEscalationDates
// ============================================================

describe('getEscalationDates', () => {
  it('generates annual escalation dates for a 3-year term', () => {
    const dates = getEscalationDates('2026-04-01', 36, 12);
    expect(dates).toEqual([
      '2026-04-01',
      '2027-04-01',
      '2028-04-01',
    ]);
  });

  it('generates semi-annual escalation dates', () => {
    const dates = getEscalationDates('2026-04-01', 24, 6);
    expect(dates).toEqual([
      '2026-04-01',
      '2026-10-01',
      '2027-04-01',
      '2027-10-01',
    ]);
  });

  it('includes only the start date for a 12-month term with annual escalation', () => {
    const dates = getEscalationDates('2026-04-01', 12, 12);
    expect(dates).toEqual(['2026-04-01']);
  });

  it('returns empty array for 0 term', () => {
    expect(getEscalationDates('2026-04-01', 0, 12)).toEqual([]);
  });

  it('returns empty array for 0 frequency', () => {
    expect(getEscalationDates('2026-04-01', 36, 0)).toEqual([]);
  });

  it('defaults to 12-month frequency', () => {
    const dates = getEscalationDates('2026-04-01', 36);
    expect(dates).toHaveLength(3);
  });
});

// ============================================================
// isLeaseExpiringSoon
// ============================================================

describe('isLeaseExpiringSoon', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when lease expires within threshold', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T00:00:00'));

    // 108 days away, threshold 180
    expect(isLeaseExpiringSoon('2026-06-30', 180)).toBe(true);
  });

  it('returns false when lease expires beyond threshold', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T00:00:00'));

    // 293 days away, threshold 180
    expect(isLeaseExpiringSoon('2027-01-01', 180)).toBe(false);
  });

  it('returns true for already expired lease', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T00:00:00'));

    expect(isLeaseExpiringSoon('2026-01-01', 180)).toBe(true);
  });

  it('uses 180-day default threshold', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T00:00:00'));

    // 108 days away with default 180 threshold
    expect(isLeaseExpiringSoon('2026-06-30')).toBe(true);
  });
});

// ============================================================
// getRemainingTerm
// ============================================================

describe('getRemainingTerm', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates remaining term for a future expiration', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T00:00:00'));

    const result = getRemainingTerm('2028-03-31');
    expect(result.isExpired).toBe(false);
    expect(result.months).toBeGreaterThan(0);
    expect(result.totalDays).toBeGreaterThan(0);
  });

  it('reports expired for a past date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T00:00:00'));

    const result = getRemainingTerm('2025-12-31');
    expect(result.isExpired).toBe(true);
    expect(result.months).toBe(0);
    expect(result.days).toBe(0);
  });

  it('reports expired for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T00:00:00'));

    const result = getRemainingTerm('2026-03-14');
    expect(result.isExpired).toBe(true);
  });
});

// ============================================================
// formatLeaseTermDisplay
// ============================================================

describe('formatLeaseTermDisplay', () => {
  it('formats a 36-month lease term', () => {
    const result = formatLeaseTermDisplay('2026-04-01', '2029-03-31');
    expect(result).toContain('Apr 2026');
    expect(result).toContain('Mar 2029');
    expect(result).toContain('36 months');
  });

  it('uses singular "month" for 1-month term', () => {
    const result = formatLeaseTermDisplay('2026-04-01', '2026-04-30');
    expect(result).toContain('1 month');
    expect(result).not.toContain('1 months');
  });

  it('includes en-dash separator', () => {
    const result = formatLeaseTermDisplay('2026-04-01', '2029-03-31');
    expect(result).toContain('\u2013');
  });
});
