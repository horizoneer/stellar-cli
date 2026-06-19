/**
 * Search-related type definitions for Stellar Inspector CLI
 */

import { Transaction } from './index';

/**
 * Search query options
 */
export interface SearchQuery {
  account?: string;
  memo?: string;
  startTime?: string;
  endTime?: string;
  asset?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Horizon API response for transactions list
 */
export interface TransactionsResponse {
  _links: {
    self: { href: string };
    next: { href: string };
    prev: { href: string };
  };
  _embedded: {
    records: Transaction[];
  };
}

/**
 * Search result item
 */
export interface SearchResult {
  type: 'transaction' | 'operation' | 'account';
  id: string;
  data: Record<string, unknown>;
}

/**
 * Time bounds for search
 */
export interface TimeBounds {
  minTime: number;
  maxTime: number;
}
