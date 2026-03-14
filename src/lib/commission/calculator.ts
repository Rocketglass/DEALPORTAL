/**
 * Commission calculation engine for commercial real estate leases.
 *
 * Handles standard commissions, tiered commission structures, and
 * broker/agent splits. Rates are based on San Diego East County
 * commercial market conventions.
 */

// ============================================================
// Types
// ============================================================

/** A single tier in a tiered commission structure. */
export interface CommissionTier {
  /** Label for this tier (e.g. "Year 1", "Years 2-5") */
  label: string;
  /** Commission rate as a percentage (e.g. 6 for 6%) */
  rate: number;
  /** The lease value amount this tier applies to */
  amount: number;
}

/** Full breakdown of a commission calculation. */
export interface CommissionBreakdown {
  /** Total lease value used for the calculation */
  leaseValue: number;
  /** Commission rate (for flat-rate) or weighted average rate (for tiered) */
  effectiveRate: number;
  /** Total commission amount before splits */
  totalCommission: number;
  /** Individual tier calculations (empty for flat-rate) */
  tiers: CommissionTierResult[];
}

/** Result of a single tier calculation. */
export interface CommissionTierResult {
  /** Label for this tier */
  label: string;
  /** Rate applied to this tier */
  rate: number;
  /** Lease value portion for this tier */
  tierValue: number;
  /** Commission earned on this tier */
  tierCommission: number;
}

/** Commission split between listing broker, cooperating broker, and agents. */
export interface CommissionSplit {
  /** Total commission being split */
  totalCommission: number;
  /** Amount to the listing/broker side */
  brokerAmount: number;
  /** Amount to the cooperating/agent side */
  agentAmount: number;
  /** Broker's percentage of the total */
  brokerPercent: number;
  /** Agent's percentage of the total */
  agentPercent: number;
}

/** Supported commercial lease types for default rate lookup. */
export type LeaseType = 'industrial' | 'retail' | 'office' | 'flex';

// ============================================================
// calculateCommission
// ============================================================

/**
 * Calculate a flat-rate commission on a lease.
 *
 * @param leaseValue       Total lease consideration over the full term
 * @param commissionRate   Commission rate as a percentage (e.g. 5 for 5%)
 * @param splitPercentage  Optional broker's share as a percentage (e.g. 50 for 50%).
 *                         When provided, returns the broker's portion only.
 * @returns Commission amount (full or broker's portion if split provided)
 *
 * @example
 * calculateCommission(500000, 5)      // => 25000
 * calculateCommission(500000, 5, 50)  // => 12500 (broker's 50% share)
 */
export function calculateCommission(
  leaseValue: number,
  commissionRate: number,
  splitPercentage?: number,
): number {
  if (leaseValue <= 0 || commissionRate <= 0) return 0;

  const commission = round2(leaseValue * (commissionRate / 100));

  if (splitPercentage != null && splitPercentage > 0) {
    return round2(commission * (splitPercentage / 100));
  }

  return commission;
}

// ============================================================
// calculateTieredCommission
// ============================================================

/**
 * Calculate commission using a tiered rate structure.
 *
 * Common in commercial leasing: a higher rate applies to the first year's
 * value and a lower rate to remaining years, reflecting the higher effort
 * involved in initial lease-up.
 *
 * @param leaseValue Total lease consideration
 * @param tiers      Array of commission tiers, each with a rate and the
 *                   amount of lease value it applies to
 * @returns Full commission breakdown with per-tier detail
 *
 * @example
 * // 6% on first year ($60,000), 3% on remaining ($120,000)
 * calculateTieredCommission(180000, [
 *   { label: 'Year 1', rate: 6, amount: 60000 },
 *   { label: 'Years 2-3', rate: 3, amount: 120000 },
 * ])
 * // => { totalCommission: 7200, effectiveRate: 4.0, ... }
 */
export function calculateTieredCommission(
  leaseValue: number,
  tiers: CommissionTier[],
): CommissionBreakdown {
  if (leaseValue <= 0 || tiers.length === 0) {
    return {
      leaseValue,
      effectiveRate: 0,
      totalCommission: 0,
      tiers: [],
    };
  }

  const tierResults: CommissionTierResult[] = [];
  let totalCommission = 0;

  for (const tier of tiers) {
    const tierValue = Math.max(0, tier.amount);
    const tierCommission = round2(tierValue * (tier.rate / 100));
    totalCommission += tierCommission;

    tierResults.push({
      label: tier.label,
      rate: tier.rate,
      tierValue,
      tierCommission,
    });
  }

  totalCommission = round2(totalCommission);
  const effectiveRate = leaseValue > 0
    ? round2((totalCommission / leaseValue) * 100)
    : 0;

  return {
    leaseValue,
    effectiveRate,
    totalCommission,
    tiers: tierResults,
  };
}

// ============================================================
// calculateCommissionSplit
// ============================================================

/**
 * Calculate the commission split between broker and cooperating agent.
 *
 * In dual-agency (common for Rocket Glass), the full commission goes to
 * one brokerage. In cooperative deals, the commission is split between
 * the listing broker and the tenant's broker/agent.
 *
 * @param totalCommission Total commission amount
 * @param brokerSplit     Broker's share as a percentage (e.g. 60 for 60%)
 * @param agentSplit      Agent's share as a percentage (e.g. 40 for 40%).
 *                        If omitted, calculated as the remainder of brokerSplit.
 * @returns Split breakdown
 *
 * @example
 * calculateCommissionSplit(25000, 60, 40)
 * // => { brokerAmount: 15000, agentAmount: 10000, ... }
 *
 * calculateCommissionSplit(25000, 60)
 * // => { brokerAmount: 15000, agentAmount: 10000, ... }
 */
export function calculateCommissionSplit(
  totalCommission: number,
  brokerSplit: number,
  agentSplit?: number,
): CommissionSplit {
  if (totalCommission <= 0) {
    return {
      totalCommission: 0,
      brokerAmount: 0,
      agentAmount: 0,
      brokerPercent: brokerSplit,
      agentPercent: agentSplit ?? (100 - brokerSplit),
    };
  }

  const effectiveAgentSplit = agentSplit ?? (100 - brokerSplit);
  const brokerAmount = round2(totalCommission * (brokerSplit / 100));
  const agentAmount = round2(totalCommission * (effectiveAgentSplit / 100));

  return {
    totalCommission,
    brokerAmount,
    agentAmount,
    brokerPercent: brokerSplit,
    agentPercent: effectiveAgentSplit,
  };
}

// ============================================================
// getDefaultCommissionRate
// ============================================================

/**
 * Get the default commission rate for a given lease type.
 *
 * Based on San Diego East County commercial market conventions:
 * - Industrial: 5% — high volume, competitive market in East County
 * - Retail: 6% — higher effort for tenant placement, longer vacancy risk
 * - Office: 5% — standard professional/medical office rate
 * - Flex: 5% — hybrid industrial/office, priced like industrial
 *
 * These are starting points; actual rates are negotiated per deal.
 *
 * @param leaseType Type of commercial lease
 * @returns Default commission rate as a percentage
 *
 * @example
 * getDefaultCommissionRate('industrial') // => 5
 * getDefaultCommissionRate('retail')     // => 6
 */
export function getDefaultCommissionRate(leaseType: LeaseType): number {
  const rates: Record<LeaseType, number> = {
    industrial: 5,
    retail: 6,
    office: 5,
    flex: 5,
  };

  return rates[leaseType] ?? 5;
}

// ============================================================
// Internal helpers
// ============================================================

/** Round a number to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
