/**
 * Fee-related type definitions for Stellar Inspector CLI
 */

/**
 * Represents fee stats from the Horizon API
 */
export interface FeeStats {
  last_ledger: string;
  last_ledger_base_fee: string;
  ledger_capacity_usage: string;
  last_ledger_fee_charged: string;
  fee_charged: FeeDistribution;
  max_fee: FeeDistribution;
}

/**
 * Represents fee distribution statistics
 */
export interface FeeDistribution {
  min: string;
  max: string;
  mode: string;
  p10: string;
  p20: string;
  p30: string;
  p40: string;
  p50: string;
  p60: string;
  p70: string;
  p80: string;
  p90: string;
  p95: string;
  p99: string;
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
