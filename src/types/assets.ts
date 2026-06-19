/**
 * Assets-related type definitions for Stellar Inspector CLI
 */

/**
 * Represents an asset from the Horizon API
 */
export interface Asset {
  asset_type: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
  asset_code?: string;
  asset_issuer?: string;
}

/**
 * Represents detailed asset information
 */
export interface AssetDetails {
  asset_type: 'credit_alphanum4' | 'credit_alphanum12';
  asset_code: string;
  asset_issuer: string;
  paging_token: string;
  contract_id?: string;
  num_accounts: number;
  num_claimable_balances: number;
  num_liquidity_pools: number;
  num_contracts: number;
  amount: string;
  accounts: {
    authorized: number;
    authorized_to_maintain_liabilities: number;
    unauthorized: number;
  };
  claimable_balances_amount: string;
  liquidity_pools_amount: string;
  contracts_amount: string;
  balances: {
    authorized: string;
    authorized_to_maintain_liabilities: string;
    unauthorized: string;
  };
  flags: {
    auth_required: boolean;
    auth_revocable: boolean;
    auth_immutable: boolean;
    auth_clawback_enabled: boolean;
  };
}

/**
 * Horizon API response for assets list
 */
export interface AssetsResponse {
  _links: {
    self: { href: string };
    next: { href: string };
    prev: { href: string };
  };
  _embedded: {
    records: AssetDetails[];
  };
}

/**
 * Represents asset stats from Horizon
 */
export interface AssetStats {
  amount: string;
  num_accounts: number;
  flags: {
    auth_required: boolean;
    auth_revocable: boolean;
    auth_immutable: boolean;
  };
}
