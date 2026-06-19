/**
 * Fee-related type definitions for Stellar Inspector CLI
 */

/**
 * Represents fee stats from the Horizon API
 */
export interface FeeStats {
  last_ledger: number;
  last_ledger_base_fee: number;
  ledger_capacity_usage: string;
  fee_charged: FeeDistribution;
  max_fee: FeeDistribution;
}

/**
 * Represents fee distribution statistics
 */
export interface FeeDistribution {
  min: number;
  max: number;
  mode: number;
  p10: number;
  p20: number;
  p30: number;
  p40: number;
  p50: number;
  p60: number;
  p70: number;
  p80: number;
  p90: number;
  p95: number;
  p99: number;
}

/**
 * Represents transaction fee information
 */
export interface TransactionFee {
  min: number;
  max: number;
  mode: number;
  average: number;
}
