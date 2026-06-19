/**
 * Fee statistics API integration for Stellar Inspector CLI
 */

import axios from 'axios';
import { Network, HORIZON_URLS } from './horizon';
import { FeeStats } from '../types/fee';
import { HorizonError } from '../utils/errors';

/**
 * Fetch current fee statistics from Horizon
 * @param network - Network to query
 * @returns Fee statistics
 */
export async function fetchFeeStats(
  network: Network = 'mainnet'
): Promise<FeeStats> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/fee_stats`;

  try {
    const response = await axios.get<FeeStats>(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new HorizonError(
        'Unable to fetch fee statistics',
        error.response?.status || 500,
        'HTTP_ERROR'
      );
    }
    throw error;
  }
}

/**
 * Convert stroops to XLM
 * @param stroops - Fee in stroops
 * @returns Fee in XLM
 */
export function stroopsToXlm(stroops: number): string {
  return (stroops / 10_000_000).toFixed(7);
}

/**
 * Get recommended fee based on priority
 * @param stats - Fee statistics
 * @param priority - 'low', 'medium', or 'high'
 * @returns Recommended fee in stroops
 */
export function getRecommendedFee(
  stats: FeeStats,
  priority: 'low' | 'medium' | 'high' = 'medium'
): number {
  switch (priority) {
    case 'low':
      return stats.fee_charged.p10;
    case 'medium':
      return stats.fee_charged.p50;
    case 'high':
      return stats.fee_charged.p90;
    default:
      return stats.fee_charged.mode;
  }
}

/**
 * Check if network is congested
 * @param stats - Fee statistics
 * @returns Congestion level
 */
export function getCongestionLevel(stats: FeeStats): 'low' | 'medium' | 'high' {
  const usage = parseFloat(stats.ledger_capacity_usage);
  if (usage < 0.5) return 'low';
  if (usage < 0.8) return 'medium';
  return 'high';
}
