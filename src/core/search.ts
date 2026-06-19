/**
 * Search API integration for Stellar Inspector CLI
 */

import axios from 'axios';
import { Network, HORIZON_URLS } from './horizon';
import { SearchQuery, TransactionsResponse } from '../types/search';
import { HorizonError } from '../utils/errors';

/**
 * Search for transactions by various criteria
 * @param query - Search query parameters
 * @param network - Network to query
 * @returns Transactions matching the query
 */
export async function searchTransactions(
  query: SearchQuery,
  network: Network = 'mainnet'
): Promise<TransactionsResponse> {
  const baseUrl = HORIZON_URLS[network];
  const params: Record<string, string | number> = {
    limit: query.limit || 10,
    order: 'desc',
  };

  if (query.account) {
    const url = `${baseUrl}/accounts/${query.account}/transactions`;
    return await fetchWithParams(url, params);
  }

  return await fetchWithParams(`${baseUrl}/transactions`, params);
}

/**
 * Fetch URL with query parameters
 */
async function fetchWithParams(url: string, params: Record<string, string | number>): Promise<TransactionsResponse> {
  try {
    const response = await axios.get<TransactionsResponse>(url, {
      params,
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError('No transactions found matching criteria', 404, 'NOT_FOUND');
      }
      throw new HorizonError(
        error.response?.data?.title || `HTTP ${error.response?.status}`,
        error.response?.status || 500,
        'HTTP_ERROR'
      );
    }
    throw error;
  }
}

/**
 * Search for transactions by account
 * @param accountId - Stellar account ID
 * @param limit - Maximum number of results
 * @param network - Network to query
 */
export async function searchByAccount(
  accountId: string,
  limit: number = 10,
  network: Network = 'mainnet'
): Promise<TransactionsResponse> {
  return searchTransactions({ account: accountId, limit }, network);
}

/**
 * Convert timestamp to ledger close time format
 */
export function dateToIso(date: Date | string): string {
  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }
  return date.toISOString();
}
