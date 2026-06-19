/**
 * Effects-related type definitions for Stellar Inspector CLI
 */

/**
 * Represents an effect from the Horizon API
 */
export interface Effect {
  id: string;
  paging_token: string;
  account: string;
  type: string;
  created_at: string;
  [key: string]: unknown;
}

/**
 * Horizon API response for effects
 */
export interface EffectsResponse {
  _links: {
    self: { href: string };
    next: { href: string };
    prev: { href: string };
  };
  _embedded: {
    records: Effect[];
  };
}

/**
 * Effect type enumeration
 */
export type EffectType =
  | 'account_created'
  | 'account_removed'
  | 'account_credited'
  | 'account_debited'
  | 'account_thresholds_updated'
  | 'account_home_domain_updated'
  | 'account_flags_updated'
  | 'account_inflation_destination_updated'
  | 'signer_created'
  | 'signer_removed'
  | 'signer_updated'
  | 'trustline_created'
  | 'trustline_removed'
  | 'trustline_updated'
  | 'trustline_authorized'
  | 'trustline_deauthorized'
  | 'offer_created'
  | 'offer_removed'
  | 'offer_updated'
  | 'trade'
  | 'data_created'
  | 'data_removed'
  | 'data_updated'
  | 'sequence_bumped'
  | 'claimable_balance_created'
  | 'claimable_balance_claimant_created'
  | 'claimable_balance_claimed';
