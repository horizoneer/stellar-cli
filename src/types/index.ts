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

/**
 * Represents a Stellar Claimable Balance from Horizon API
 */
export interface ClaimableBalance {
  id: string;
  asset: string;
  amount: string;
  sponsor?: string;
  last_modified_ledger: number;
  last_modified_time: string;
  claimants: Claimant[];
}

/**
 * Represents a claimant on a claimable balance
 */
export interface Claimant {
  destination: string;
  predicate: Predicate;
}

/**
 * Represents a predicate for a claimable balance claimant
 */
export interface Predicate {
  and?: Predicate[];
  or?: Predicate[];
  not?: Predicate;
  abs_before?: string;
  rel_before?: string;
  unconditional?: boolean;
}

/**
 * Represents Horizon server info from root endpoint
 */
export interface HorizonInfo {
  _links: {
    account: { href: string };
    accounts: { href: string };
    claimable_balances: { href: string };
    effects: { href: string };
    fee_stats: { href: string };
    ledgers: { href: string };
    offers: { href: string };
    operations: { href: string };
    order_book: { href: string };
    pathfind: { href: string };
    payments: { href: string };
    trade_aggregations: { href: string };
    trades: { href: string };
    transactions: { href: string };
  };
  horizon_version: string;
  stellar_core_version: string;
  ingest_latest_ledger: number;
  ingest_latest_ledger_close_time: string;
  history_latest_ledger: number;
  history_latest_ledger_close_time: string;
  history_elder_ledger: number;
  history_elder_ledger_close_time: string;
  core_latest_ledger: number;
  network_passphrase: string;
  current_protocol_version: number;
  core_supported_protocol_version: number;
}

/**
 * Represents a pathfind response from Horizon
 */
export interface PathfindResponse {
  destination_account: string;
  destination_amount: string;
  destination_asset_type: string;
  destination_asset_code?: string;
  destination_asset_issuer?: string;
  source_account: string;
  records: PaymentPath[];
}

/**
 * Represents a single payment path
 */
export interface PaymentPath {
  destination_amount: string;
  destination_asset_type: string;
  destination_asset_code?: string;
  destination_asset_issuer?: string;
  source_amount: string;
  source_asset_type: string;
  source_asset_code?: string;
  source_asset_issuer?: string;
  path: Asset[];
}

/**
 * Represents an asset in a path
 */
export interface Asset {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}
