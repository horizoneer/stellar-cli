/**
 * Horizon API integration for Stellar Inspector CLI
 */

import axios from 'axios';
import { Transaction, OperationsResponse, Ledger, CollectionResponse, Account, Operation } from '../types';
import { HorizonError } from '../utils/errors';

/**
 * Horizon API endpoints for different networks
 */
export const HORIZON_URLS = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
} as const;

export type Network = keyof typeof HORIZON_URLS;

/**
 * Validates if a string is a valid transaction hash
 * Transaction hashes are 64-character hex strings
 * @param input - String to validate
 * @returns true if input is a valid transaction hash
 */
export function isTransactionHash(input: string): boolean {
  return /^[a-f0-9]{64}$/i.test(input);
}

/**
 * Fetches a transaction from Horizon API
 * Automatically detects network based on transaction hash or defaults to mainnet
 * @param hashOrId - Transaction hash (64 hex chars) or transaction ID
 * @param network - Network to query (mainnet or testnet)
 * @returns Transaction data from Horizon
 * @throws HorizonError if transaction not found or API error
 */
export async function fetchTransaction(
  hashOrId: string,
  network: Network = 'mainnet'
): Promise<Transaction> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/transactions/${hashOrId}`;

  try {
    const response = await axios.get<Transaction>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Transaction "${hashOrId}" not found on ${network}`,
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
      if (error.request) {
        throw new HorizonError(
          'No response from Horizon server',
          0,
          'NETWORK_ERROR'
        );
      }
    }
    throw error;
  }
}

/**
 * Fetches all operations for a transaction
 * @param transactionHash - Transaction hash
 * @param network - Network to query
 * @returns Array of operations
 */
export async function fetchOperations(
  transactionHash: string,
  network: Network = 'mainnet'
): Promise<OperationsResponse> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/transactions/${transactionHash}/operations`;

  try {
    const response = await axios.get<OperationsResponse>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Operations for transaction "${transactionHash}" not found`,
          404,
          'NOT_FOUND'
        );
      }
    }
    throw error;
  }
}

/**
 * Validates if a string is a valid Stellar account ID
 * @param input - String to validate
 * @returns true if input looks like a valid account ID
 */
export function isAccountId(input: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(input);
}

/**
 * Fetches a ledger from Horizon API
 * @param sequence - Ledger sequence number
 * @param network - Network to query
 * @returns Ledger data from Horizon
 */
export async function fetchLedger(
  sequence: number,
  network: Network = 'mainnet'
): Promise<Ledger> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/ledgers/${sequence}`;

  try {
    const response = await axios.get<Ledger>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Ledger "${sequence}" not found on ${network}`,
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
 * Fetches an account from Horizon API
 * @param accountId - Stellar account ID
 * @param network - Network to query
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
 * Fetches recent transactions for an account
 * @param accountId - Stellar account ID
 * @param network - Network to query
 * @param limit - Number of transactions to fetch
 * @returns Collection of transactions
 */
export async function fetchAccountTransactions(
  accountId: string,
  network: Network = 'mainnet',
  limit: number = 10
): Promise<CollectionResponse<Transaction>> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/accounts/${accountId}/transactions?limit=${limit}`;

  try {
    const response = await axios.get<CollectionResponse<Transaction>>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Transactions for account "${accountId}" not found`,
          404,
          'NOT_FOUND'
        );
      }
    }
    throw error;
  }
}

/**
 * Fetches recent payments for an account
 * @param accountId - Stellar account ID
 * @param network - Network to query
 * @param limit - Number of payments to fetch
 * @returns Collection of payments
 */
export async function fetchAccountPayments(
  accountId: string,
  network: Network = 'mainnet',
  limit: number = 10
): Promise<CollectionResponse<Operation>> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/accounts/${accountId}/payments?limit=${limit}`;

  try {
    const response = await axios.get<CollectionResponse<Operation>>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Payments for account "${accountId}" not found`,
          404,
          'NOT_FOUND'
        );
      }
    }
    throw error;
  }
}
