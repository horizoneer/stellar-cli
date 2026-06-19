/**
 * Account-related type definitions for Stellar Inspector CLI
 */

/**
 * Represents a Stellar account from Horizon API
 */
export interface Account {
  id: string;
  account_id: string;
  sequence: string;
  subentry_count: number;
  inflation_destination?: string;
  last_modified_ledger: number;
  last_modified_time: string;
  thresholds: {
    low_threshold: number;
    med_threshold: number;
    high_threshold: number;
  };
  flags: {
    auth_required: boolean;
    auth_revocable: boolean;
    auth_immutable: boolean;
    auth_clawback_enabled: boolean;
  };
  balances: Balance[];
  signers: Signer[];
  data: Record<string, string>;
  num_sponsoring: number;
  num_sponsored: number;
}

/**
 * Represents a balance for an asset held by an account
 */
export interface Balance {
  balance: string;
  limit?: string;
  buying_liabilities?: string;
  selling_liabilities?: string;
  last_modified_ledger?: number;
  is_authorized?: boolean;
  is_authorized_to_maintain_liabilities?: boolean;
  is_clawback_enabled?: boolean;
  asset_type: 'native' | 'credit_alphanum4' | 'credit_alphanum12' | 'liquidity_pool_shares';
  asset_code?: string;
  asset_issuer?: string;
  liquidity_pool_id?: string;
}

/**
 * Represents a signer on an account
 */
export interface Signer {
  key: string;
  type: 'ed25519_public_key' | 'sha256_hash' | 'preauth_tx' | 'ed25519_signed_payload';
  weight: number;
  sponsor?: string;
}

/**
 * Horizon API response for account balances
 */
export interface AccountBalancesResponse {
  balances: Balance[];
}
