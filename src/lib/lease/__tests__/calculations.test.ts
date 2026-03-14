import { describe, it, expect } from 'vitest';
import {
  calculateEffectiveRent,
  calculatePricePerSqFt,
  calculateLeaseValue,
  calculateNNNEstimate,
  calculateTIAmortization,
  calculateProRatedRent,
} from '../calculations';

// ============================================================
// calculateEffectiveRent
// ============================================================

describe('calculateEffectiveRent', () => {
  it('returns base rent when no free rent months', () => {
    expect(calculateEffectiveRent(5000, 0, 36)).toBe(5000);
  });

  it('spreads free rent across the full term', () => {
    // 36-month lease, $5000/mo, 3 months free
    // Paying months: 33, total rent: 165000, effective: 165000/36 = 4583.33
    expect(calculateEffectiveRent(5000, 3, 36)).toBe(4583.33);
  });

  it('returns 0 when term is 0 or negative', () => {
    expect(calculateEffectiveRent(5000, 0, 0)).toBe(0);
    expect(calculateEffectiveRent(5000, 0, -1)).toBe(0);
  });

  it('returns 0 when free rent equals or exceeds term', () => {
    expect(calculateEffectiveRent(5000, 36, 36)).toBe(0);
    expect(calculateEffectiveRent(5000, 40, 36)).toBe(0);
  });

  it('treats negative free rent months as 0', () => {
    expect(calculateEffectiveRent(5000, -3, 36)).toBe(5000);
  });

  it('handles 1 month free on a 12-month lease', () => {
    // 11 paying months, total: 55000, effective: 55000/12 = 4583.33
    expect(calculateEffectiveRent(5000, 1, 12)).toBe(4583.33);
  });
});

// ============================================================
// calculatePricePerSqFt
// ============================================================

describe('calculatePricePerSqFt', () => {
  it('calculates monthly and annual price per sqft', () => {
    const result = calculatePricePerSqFt(5000, 2500);
    expect(result.perMonth).toBe(2);
    expect(result.perYear).toBe(24);
  });

  it('returns zeros when sqft is 0', () => {
    const result = calculatePricePerSqFt(5000, 0);
    expect(result.perMonth).toBe(0);
    expect(result.perYear).toBe(0);
  });

  it('returns zeros when sqft is negative', () => {
    const result = calculatePricePerSqFt(5000, -100);
    expect(result.perMonth).toBe(0);
    expect(result.perYear).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    // 3000 / 700 = 4.285714...
    const result = calculatePricePerSqFt(3000, 700);
    expect(result.perMonth).toBe(4.29);
    expect(result.perYear).toBe(51.48);
  });

  it('handles small rent values', () => {
    const result = calculatePricePerSqFt(100, 5000);
    expect(result.perMonth).toBe(0.02);
    expect(result.perYear).toBe(0.24);
  });
});

// ============================================================
// calculateLeaseValue
// ============================================================

describe('calculateLeaseValue', () => {
  it('calculates flat rent over the term', () => {
    expect(calculateLeaseValue(5000, 36)).toBe(180000);
  });

  it('returns 0 for non-positive term', () => {
    expect(calculateLeaseValue(5000, 0)).toBe(0);
    expect(calculateLeaseValue(5000, -5)).toBe(0);
  });

  it('uses escalations when provided', () => {
    const result = calculateLeaseValue(5000, 36, [
      { monthlyAmount: 5000, months: 12 },
      { monthlyAmount: 5150, months: 12 },
      { monthlyAmount: 5304.50, months: 12 },
    ]);
    // 5000*12 + 5150*12 + 5304.50*12 = 60000 + 61800 + 63654 = 185454
    expect(result).toBe(185454);
  });

  it('ignores monthlyRent when escalations are provided', () => {
    const result = calculateLeaseValue(9999, 36, [
      { monthlyAmount: 1000, months: 36 },
    ]);
    expect(result).toBe(36000);
  });

  it('handles escalation with 0 months', () => {
    const result = calculateLeaseValue(5000, 36, [
      { monthlyAmount: 5000, months: 0 },
      { monthlyAmount: 6000, months: 36 },
    ]);
    expect(result).toBe(216000);
  });
});

// ============================================================
// calculateNNNEstimate
// ============================================================

describe('calculateNNNEstimate', () => {
  it('calculates all NNN components correctly', () => {
    const result = calculateNNNEstimate(5000, 0.15, 0.10, 0.05, 2500);
    expect(result.baseRent).toBe(5000);
    expect(result.camMonthly).toBe(375);
    expect(result.taxMonthly).toBe(250);
    expect(result.insuranceMonthly).toBe(125);
    expect(result.totalMonthly).toBe(5750);
    expect(result.totalAnnual).toBe(69000);
    expect(result.nnnPerSqftMonth).toBe(0.3);
    expect(result.allInPerSqftMonth).toBe(2.3);
  });

  it('handles zero sqft for per-sqft metrics', () => {
    const result = calculateNNNEstimate(5000, 0.15, 0.10, 0.05, 0);
    expect(result.nnnPerSqftMonth).toBe(0);
    expect(result.allInPerSqftMonth).toBe(0);
    expect(result.totalMonthly).toBe(5000);
  });

  it('handles zero NNN charges', () => {
    const result = calculateNNNEstimate(5000, 0, 0, 0, 2500);
    expect(result.camMonthly).toBe(0);
    expect(result.taxMonthly).toBe(0);
    expect(result.insuranceMonthly).toBe(0);
    expect(result.totalMonthly).toBe(5000);
    expect(result.nnnPerSqftMonth).toBe(0);
  });
});

// ============================================================
// calculateTIAmortization
// ============================================================

describe('calculateTIAmortization', () => {
  it('calculates amortization with interest', () => {
    const result = calculateTIAmortization(15, 2500, 60, 8);
    expect(result.totalAllowance).toBe(37500);
    expect(result.monthlyPayment).toBe(760.36);
    expect(result.totalCost).toBe(45621.6);
    expect(result.totalInterest).toBe(8121.6);
  });

  it('calculates simple division when interest rate is 0', () => {
    const result = calculateTIAmortization(10, 1000, 60, 0);
    expect(result.totalAllowance).toBe(10000);
    expect(result.monthlyPayment).toBe(166.67);
    expect(result.totalCost).toBe(10000.2); // slight rounding from 166.67 * 60
    expect(result.totalInterest).toBe(0);
  });

  it('returns zero payment when term is 0', () => {
    const result = calculateTIAmortization(15, 2500, 0, 8);
    expect(result.totalAllowance).toBe(37500);
    expect(result.monthlyPayment).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it('returns zero payment when allowance is 0', () => {
    const result = calculateTIAmortization(0, 2500, 60, 8);
    expect(result.totalAllowance).toBe(0);
    expect(result.monthlyPayment).toBe(0);
  });

  it('handles negative interest rate as zero-interest', () => {
    const result = calculateTIAmortization(10, 1000, 60, -5);
    expect(result.monthlyPayment).toBe(166.67);
    expect(result.totalInterest).toBe(0);
  });
});

// ============================================================
// calculateProRatedRent
// ============================================================

describe('calculateProRatedRent', () => {
  it('calculates pro-rated rent for mid-month move-in', () => {
    const result = calculateProRatedRent(5000, '2026-04-15');
    expect(result.daysInMonth).toBe(30);
    expect(result.occupiedDays).toBe(16);
    expect(result.dailyRate).toBe(166.67);
    expect(result.proRatedAmount).toBe(2666.72);
  });

  it('returns full month rent for 1st of the month move-in', () => {
    const result = calculateProRatedRent(3000, '2026-01-01');
    expect(result.daysInMonth).toBe(31);
    expect(result.occupiedDays).toBe(31);
    expect(result.dailyRate).toBe(96.77);
    expect(result.proRatedAmount).toBe(2999.87); // slight rounding artifact
  });

  it('handles last day of month move-in', () => {
    const result = calculateProRatedRent(3100, '2026-03-31');
    expect(result.daysInMonth).toBe(31);
    expect(result.occupiedDays).toBe(1);
    expect(result.dailyRate).toBe(100);
    expect(result.proRatedAmount).toBe(100);
  });

  it('handles February (28 days) correctly', () => {
    const result = calculateProRatedRent(2800, '2026-02-15');
    expect(result.daysInMonth).toBe(28);
    expect(result.occupiedDays).toBe(14);
    expect(result.dailyRate).toBe(100);
    expect(result.proRatedAmount).toBe(1400);
  });

  it('handles leap year February (29 days)', () => {
    const result = calculateProRatedRent(2900, '2028-02-15');
    expect(result.daysInMonth).toBe(29);
    expect(result.occupiedDays).toBe(15);
    expect(result.dailyRate).toBe(100);
    expect(result.proRatedAmount).toBe(1500);
  });

  it('accepts a Date object as input', () => {
    const result = calculateProRatedRent(6000, new Date(2026, 5, 10)); // June 10
    expect(result.daysInMonth).toBe(30);
    expect(result.occupiedDays).toBe(21);
  });
});
