/**
 * Effects API integration for Stellar Inspector CLI
 */

import axios from 'axios';
import { Network, HORIZON_URLS } from './horizon';
import { EffectsResponse, Effect } from '../types/effects';
import { HorizonError } from '../utils/errors';

/**
 * Fetch effects for a transaction
 * @param transactionHash - Transaction hash
 * @param network - Network to query
 * @returns Effects for the transaction
 */
export async function fetchTransactionEffects(
  transactionHash: string,
  network: Network = 'mainnet'
): Promise<EffectsResponse> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/transactions/${transactionHash}/effects`;

  try {
    const response = await axios.get<EffectsResponse>(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Effects for transaction "${transactionHash}" not found`,
          404,
          'NOT_FOUND'
        );
      }
    }
    throw error;
  }
}

/**
 * Fetch effects for an account
 * @param accountId - Stellar account ID
 * @param limit - Maximum number of effects
 * @param network - Network to query
 */
export async function fetchAccountEffects(
  accountId: string,
  limit: number = 10,
  network: Network = 'mainnet'
): Promise<EffectsResponse> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/accounts/${accountId}/effects`;

  try {
    const response = await axios.get<EffectsResponse>(url, {
      params: { limit },
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
 * Decode an effect into human-readable format
 */
export interface DecodedEffect {
  type: string;
  account: string;
  description: string;
  details: Record<string, unknown>;
  timestamp: string;
}

/**
 * Decode an effect for display
 */
export function decodeEffect(effect: Effect): DecodedEffect {
  const type = effect.type;
  const timestamp = new Date(effect.created_at).toLocaleString();

  let description = '';
  const details: Record<string, unknown> = { ...effect };

  switch (type) {
    case 'account_credited':
      description = `Credited ${effect.amount} ${effect.asset_type === 'native' ? 'XLM' : effect.asset_code}`;
      break;
    case 'account_debited':
      description = `Debited ${effect.amount} ${effect.asset_type === 'native' ? 'XLM' : effect.asset_code}`;
      break;
    case 'account_created':
      description = `Account created with ${effect.starting_balance} XLM`;
      break;
    case 'trade':
      description = `Traded ${effect.sold_amount} ${effect.sold_asset_type} for ${effect.bought_amount} ${effect.bought_asset_type}`;
      break;
    case 'signer_created':
      description = `Signer added: ${effect.signer_public_key}`;
      break;
    case 'signer_removed':
      description = `Signer removed: ${effect.signer_public_key}`;
      break;
    default:
      description = type.replace(/_/g, ' ');
  }

  return {
    type,
    account: effect.account,
    description,
    details,
    timestamp,
  };
}
