import { describe, it, expect } from 'vitest';
import {
  calculateCommission,
  calculateTieredCommission,
  calculateCommissionSplit,
  getDefaultCommissionRate,
} from '../calculator';

// ============================================================
// calculateCommission
// ============================================================

describe('calculateCommission', () => {
  it('calculates flat-rate commission', () => {
    expect(calculateCommission(500000, 5)).toBe(25000);
  });

  it('applies split percentage when provided', () => {
    expect(calculateCommission(500000, 5, 50)).toBe(12500);
  });

  it('returns 0 for zero lease value', () => {
    expect(calculateCommission(0, 5)).toBe(0);
  });

  it('returns 0 for negative lease value', () => {
    expect(calculateCommission(-100000, 5)).toBe(0);
  });

  it('returns 0 for zero commission rate', () => {
    expect(calculateCommission(500000, 0)).toBe(0);
  });

  it('returns 0 for negative commission rate', () => {
    expect(calculateCommission(500000, -3)).toBe(0);
  });

  it('handles fractional rates', () => {
    expect(calculateCommission(100000, 5.5)).toBe(5500);
  });

  it('returns full commission when split is not provided', () => {
    expect(calculateCommission(200000, 6)).toBe(12000);
  });

  it('ignores split of 0', () => {
    // splitPercentage of 0 is falsy-ish but the code checks != null && > 0
    expect(calculateCommission(200000, 6, 0)).toBe(12000);
  });
});

// ============================================================
// calculateTieredCommission
// ============================================================

describe('calculateTieredCommission', () => {
  it('calculates tiered commission with multiple tiers', () => {
    const result = calculateTieredCommission(180000, [
      { label: 'Year 1', rate: 6, amount: 60000 },
      { label: 'Years 2-3', rate: 3, amount: 120000 },
    ]);

    expect(result.totalCommission).toBe(7200);
    expect(result.effectiveRate).toBe(4);
    expect(result.leaseValue).toBe(180000);
    expect(result.tiers).toHaveLength(2);
    expect(result.tiers[0].tierCommission).toBe(3600);
    expect(result.tiers[1].tierCommission).toBe(3600);
  });

  it('returns zeros for zero lease value', () => {
    const result = calculateTieredCommission(0, [
      { label: 'Year 1', rate: 6, amount: 60000 },
    ]);
    expect(result.totalCommission).toBe(0);
    expect(result.effectiveRate).toBe(0);
    expect(result.tiers).toHaveLength(0);
  });

  it('returns zeros for empty tiers', () => {
    const result = calculateTieredCommission(180000, []);
    expect(result.totalCommission).toBe(0);
    expect(result.tiers).toHaveLength(0);
  });

  it('handles a single tier', () => {
    const result = calculateTieredCommission(100000, [
      { label: 'Full Term', rate: 5, amount: 100000 },
    ]);
    expect(result.totalCommission).toBe(5000);
    expect(result.effectiveRate).toBe(5);
  });

  it('handles tiers with 0 amount', () => {
    const result = calculateTieredCommission(100000, [
      { label: 'Year 1', rate: 6, amount: 0 },
      { label: 'Years 2-5', rate: 4, amount: 100000 },
    ]);
    expect(result.tiers[0].tierCommission).toBe(0);
    expect(result.tiers[1].tierCommission).toBe(4000);
    expect(result.totalCommission).toBe(4000);
  });
});

// ============================================================
// calculateCommissionSplit
// ============================================================

describe('calculateCommissionSplit', () => {
  it('splits commission between broker and agent', () => {
    const result = calculateCommissionSplit(25000, 60, 40);
    expect(result.brokerAmount).toBe(15000);
    expect(result.agentAmount).toBe(10000);
    expect(result.brokerPercent).toBe(60);
    expect(result.agentPercent).toBe(40);
    expect(result.totalCommission).toBe(25000);
  });

  it('infers agent split from broker split when omitted', () => {
    const result = calculateCommissionSplit(25000, 60);
    expect(result.brokerAmount).toBe(15000);
    expect(result.agentAmount).toBe(10000);
    expect(result.agentPercent).toBe(40);
  });

  it('handles 100/0 split', () => {
    const result = calculateCommissionSplit(10000, 100, 0);
    expect(result.brokerAmount).toBe(10000);
    expect(result.agentAmount).toBe(0);
  });

  it('handles 50/50 split', () => {
    const result = calculateCommissionSplit(10000, 50, 50);
    expect(result.brokerAmount).toBe(5000);
    expect(result.agentAmount).toBe(5000);
  });

  it('returns zeros when commission is 0', () => {
    const result = calculateCommissionSplit(0, 60, 40);
    expect(result.totalCommission).toBe(0);
    expect(result.brokerAmount).toBe(0);
    expect(result.agentAmount).toBe(0);
  });

  it('returns zeros when commission is negative', () => {
    const result = calculateCommissionSplit(-5000, 60, 40);
    expect(result.totalCommission).toBe(0);
    expect(result.brokerAmount).toBe(0);
    expect(result.agentAmount).toBe(0);
  });
});

// ============================================================
// getDefaultCommissionRate
// ============================================================

describe('getDefaultCommissionRate', () => {
  it('returns 5 for industrial', () => {
    expect(getDefaultCommissionRate('industrial')).toBe(5);
  });

  it('returns 6 for retail', () => {
    expect(getDefaultCommissionRate('retail')).toBe(6);
  });

  it('returns 5 for office', () => {
    expect(getDefaultCommissionRate('office')).toBe(5);
  });

  it('returns 5 for flex', () => {
    expect(getDefaultCommissionRate('flex')).toBe(5);
  });
});
