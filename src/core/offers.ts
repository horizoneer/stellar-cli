/**
 * Offers API integration for Stellar Inspector CLI
 */

import axios from 'axios';
import { Network, HORIZON_URLS } from './horizon';
import { OffersResponse, Offer } from '../types/offers';
import { HorizonError } from '../utils/errors';

/**
 * Fetch offers for an account
 * @param accountId - Stellar account ID
 * @param network - Network to query
 * @returns Offers for the account
 */
export async function fetchAccountOffers(
  accountId: string,
  network: Network = 'mainnet'
): Promise<OffersResponse> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/accounts/${accountId}/offers`;

  try {
    const response = await axios.get<OffersResponse>(url, {
      params: { limit: 50 },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Account "${accountId}" not found`,
          404,
          'NOT_FOUND'
        );
      }
    }
    throw error;
  }
}

/**
 * Fetch a specific offer by ID
 * @param offerId - Offer ID
 * @param network - Network to query
 */
export async function fetchOfferById(
  offerId: string,
  network: Network = 'mainnet'
): Promise<Offer> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/offers/${offerId}`;

  try {
    const response = await axios.get<Offer>(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Offer "${offerId}" not found`,
          404,
          'NOT_FOUND'
        );
      }
    }
    throw error;
  }
}

/**
 * Fetch all offers for a trading pair
 * @param sellingAsset - Selling asset
 * @param buyingAsset - Buying asset
 * @param network - Network to query
 * @param limit - Maximum number of results
 */
export async function fetchOffersForPair(
  sellingAsset: string,
  buyingAsset: string,
  network: Network = 'mainnet',
  limit: number = 20
): Promise<OffersResponse> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/offers`;

  const params: Record<string, string | number> = { limit };

  // Parse assets (format: CODE:ISSUER or XLM for native)
  if (sellingAsset.toUpperCase() === 'XLM' || sellingAsset === 'native') {
    params['selling_asset_type'] = 'native';
  } else {
    const [code, issuer] = sellingAsset.split(':');
    params['selling_asset_type'] = 'credit_alphanum4';
    params['selling_asset_code'] = code;
    params['selling_asset_issuer'] = issuer;
  }

  if (buyingAsset.toUpperCase() === 'XLM' || buyingAsset === 'native') {
    params['buying_asset_type'] = 'native';
  } else {
    const [code, issuer] = buyingAsset.split(':');
    params['buying_asset_type'] = 'credit_alphanum4';
    params['buying_asset_code'] = code;
    params['buying_asset_issuer'] = issuer;
  }

  try {
    const response = await axios.get<OffersResponse>(url, {
      params,
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new HorizonError(
        'Unable to fetch offers for pair',
        error.response?.status || 500,
        'HTTP_ERROR'
      );
    }
    throw error;
  }
}

/**
 * Decode an offer for display
 */
export interface DecodedOffer {
  id: string;
  selling: string;
  buying: string;
  amount: string;
  price: string;
  seller: string;
}

/**
 * Decode an offer for display
 */
export function decodeOffer(offer: Offer): DecodedOffer {
  const selling = offer.selling.asset_type === 'native'
    ? 'XLM'
    : `${offer.selling.asset_code}:${offer.selling.asset_issuer?.slice(0, 8)}...`;

  const buying = offer.buying.asset_type === 'native'
    ? 'XLM'
    : `${offer.buying.asset_code}:${offer.buying.asset_issuer?.slice(0, 8)}...`;

  const amount = parseFloat(offer.amount).toLocaleString('en-US', {
    maximumFractionDigits: 7,
  });

  return {
    id: offer.id,
    selling,
    buying,
    amount,
    price: offer.price,
    seller: offer.seller,
  };
}
