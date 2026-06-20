/**
 * Core type definitions for Stellar Inspector CLI
 */

export * from './account';
export * from './network';
export * from './search';
export * from './effects';
export * from './fee';
export * from './assets';
export * from './offers';

/**
 * Represents a Stellar transaction from Horizon API
 */
export interface Transaction {
  id: string;
  hash: string;
  ledger: number;
  created_at: string;
  source_account: string;
  source_account_sequence: string;
  fee_paid: number;
  operation_count: number;
  envelope_xdr: string;
  result_xdr: string;
  result_meta_xdr: string;
  memo_type: string;
  memo?: string;
  signatures: string[];
  successful: boolean;
}

/**
 * Represents a single operation within a transaction
 */
export interface Operation {
  id: string;
  paging_token: string;
  transaction_hash: string;
  type: string;
  source_account?: string;
  created_at: string;
  transaction_successful: boolean;
  // Type-specific fields are optional and vary by operation type
  [key: string]: unknown;
}

/**
 * Horizon API response for operations list
 */
export interface OperationsResponse {
  _links: {
    self: { href: string };
    next: { href: string };
    prev: { href: string };
  };
  _embedded: {
    records: Operation[];
  };
}

/**
 * Represents a Stellar ledger from Horizon API
 */
export interface Ledger {
  id: string;
  sequence: number;
  hash: string;
  prev_hash: string;
  transaction_count: number;
  operation_count: number;
  tx_set_operation_count: number;
  closed_at: string;
  total_coins: string;
  fee_pool: string;
  base_fee_in_stroops: number;
  base_reserve_in_stroops: number;
  max_tx_set_size: number;
  protocol_version: number;
}

/**
 * Represents a list of transactions/ledgers/operations from Horizon API
 */
export interface CollectionResponse<T> {
  _links: {
    self: { href: string };
    next: { href: string };
    prev: { href: string };
  };
  _embedded: {
    records: T[];
  };
}
