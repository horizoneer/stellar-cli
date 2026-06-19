/**
 * Network status and health utilities for Stellar Inspector CLI
 */

import axios from 'axios';
import { HorizonHealth, NetworkMetrics } from '../types/network';
import { HorizonError } from '../utils/errors';
import { HORIZON_URLS, Network } from './horizon';

/**
 * Fetches Horizon server health status
 * @param network - Network to query
 * @returns Health status data
 */
export async function fetchHorizonHealth(
  network: Network = 'mainnet'
): Promise<HorizonHealth> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/`;

  try {
    const response = await axios.get<HorizonHealth>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new HorizonError(
        'Unable to connect to Horizon server',
        0,
        'NETWORK_ERROR'
      );
    }
    throw error;
  }
}

/**
 * Fetches network metrics (requires Horizon with ingestion)
 * @param network - Network to query
 * @returns Network metrics data
 */
export async function fetchNetworkMetrics(
  network: Network = 'mainnet'
): Promise<NetworkMetrics | null> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/metrics`;

  try {
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch {
    // Metrics endpoint may not be available on all Horizon instances
    return null;
  }
}

/**
 * Formats a timestamp to a readable date
 */
export function formatLedgerTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
