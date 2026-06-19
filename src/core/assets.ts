/**
 * Assets API integration for Stellar Inspector CLI
 */

import axios from 'axios';
import { Network, HORIZON_URLS } from './horizon';
import { AssetDetails, AssetsResponse } from '../types/assets';
import { HorizonError } from '../utils/errors';

/**
 * Fetch asset details from Horizon
 * @param assetCode - Asset code
 * @param assetIssuer - Asset issuer account
 * @param network - Network to query
 * @returns Asset details
 */
export async function fetchAssetDetails(
  assetCode: string,
  assetIssuer: string,
  network: Network = 'mainnet'
): Promise<AssetDetails> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/assets`;

  try {
    const response = await axios.get<AssetsResponse>(url, {
      params: {
        asset_code: assetCode,
        asset_issuer: assetIssuer,
        limit: 1,
      },
      timeout: 10000,
    });

    if (response.data._embedded.records.length === 0) {
      throw new HorizonError(
        `Asset "${assetCode}" by "${assetIssuer}" not found`,
        404,
        'NOT_FOUND'
      );
    }

    return response.data._embedded.records[0];
  } catch (error) {
    if (axios.isAxiosError(error)) {
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
 * Fetch all assets (with pagination)
 * @param network - Network to query
 * @param limit - Maximum number of results
 * @returns List of assets
 */
export async function fetchAssets(
  network: Network = 'mainnet',
  limit: number = 10
): Promise<AssetsResponse> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/assets`;

  try {
    const response = await axios.get<AssetsResponse>(url, {
      params: { limit },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new HorizonError(
        'Unable to fetch assets',
        error.response?.status || 500,
        'HTTP_ERROR'
      );
    }
    throw error;
  }
}

/**
 * Search for assets by code
 * @param assetCode - Asset code to search for
 * @param network - Network to query
 * @param limit - Maximum number of results
 */
export async function searchAssetsByCode(
  assetCode: string,
  network: Network = 'mainnet',
  limit: number = 20
): Promise<AssetsResponse> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/assets`;

  try {
    const response = await axios.get<AssetsResponse>(url, {
      params: { asset_code: assetCode, limit },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new HorizonError(
        'Unable to search assets',
        error.response?.status || 500,
        'HTTP_ERROR'
      );
    }
    throw error;
  }
}

/**
 * Format asset for display
 */
export function formatAsset(asset: AssetDetails): string {
  return `${asset.asset_code}:${asset.asset_issuer.slice(0, 8)}...`;
}
