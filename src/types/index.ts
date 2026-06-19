/**
 * Core type definitions for Stellar Inspector CLI
 */

export * from './account';
export * from './network';

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
