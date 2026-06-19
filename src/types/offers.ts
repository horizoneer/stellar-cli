/**
 * Offers-related type definitions for Stellar Inspector CLI
 */

/**
 * Represents an offer from the Horizon API
 */
export interface Offer {
  id: string;
  paging_token: string;
  seller: string;
  selling: OfferAsset;
  buying: OfferAsset;
  amount: string;
  price_r: {
    n: number;
    d: number;
  };
  price: string;
  last_modified_ledger: number;
  last_modified_time: string;
  sponsor?: string;
}

/**
 * Represents an asset in an offer
 */
export interface OfferAsset {
  asset_type: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
  asset_code?: string;
  asset_issuer?: string;
}

/**
 * Horizon API response for offers
 */
export interface OffersResponse {
  _links: {
    self: { href: string };
    next: { href: string };
    prev: { href: string };
  };
  _embedded: {
    records: Offer[];
  };
}

/**
 * Horizon API response for offer details
 */
export interface OfferDetailsResponse extends Offer {
  _links: {
    self: { href: string };
    offer_maker: { href: string };
  };
}
