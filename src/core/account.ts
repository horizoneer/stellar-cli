/**
 * Account API integration for Stellar Inspector CLI
 */

import axios from 'axios';
import { Account, Balance } from '../types/account';
import { HorizonError } from '../utils/errors';
import { HORIZON_URLS, Network } from './horizon';

/**
 * Fetches account details from Horizon API
 * @param accountId - Stellar account ID (G...)
 * @param network - Network to query (mainnet or testnet)
 * @returns Account data from Horizon
 */
export async function fetchAccount(
  accountId: string,
  network: Network = 'mainnet'
): Promise<Account> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/accounts/${accountId}`;

  try {
    const response = await axios.get<Account>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Account "${accountId}" not found on ${network}`,
          404,
          'NOT_FOUND'
        );
      }
      if (error.response) {
        throw new HorizonError(
          error.response.data?.title || `HTTP ${error.response.status}`,
          error.response.status,
          error.response.data?.type || 'HTTP_ERROR'
        );
      }
    }
    throw error;
  }
}

/**
 * Formats a balance for display
 * @param balance - Balance object from Horizon
 * @returns Formatted balance string
 */
export function formatBalance(balance: Balance): string {
  const amount = parseFloat(balance.balance).toLocaleString('en-US', {
    maximumFractionDigits: 7,
  });

  if (balance.asset_type === 'native') {
    return `${amount} XLM`;
  }

  const assetCode = balance.asset_code || 'UNKNOWN';
  const issuer = balance.asset_issuer ? `(${balance.asset_issuer.slice(0, 8)}...)` : '';
  return `${amount} ${assetCode} ${issuer}`;
}

/**
 * Calculates total XLM balance (native + selling liabilities)
 * @param balances - Array of balances
 * @returns Total XLM as a number
 */
export function calculateTotalXlm(balances: Balance[]): number {
  const nativeBalance = balances.find((b) => b.asset_type === 'native');
  if (!nativeBalance) return 0;

  let total = parseFloat(nativeBalance.balance);
  if (nativeBalance.selling_liabilities) {
    total -= parseFloat(nativeBalance.selling_liabilities);
  }
  if (nativeBalance.buying_liabilities) {
    total += parseFloat(nativeBalance.buying_liabilities);
  }
  return total;
}
