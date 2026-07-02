/**
 * Horizon API integration for Stellar Inspector CLI
 */

import axios from 'axios';
import { Transaction, OperationsResponse, Ledger, CollectionResponse, Account, Operation, ClaimableBalance, HorizonInfo, PathfindResponse, Trade, Orderbook, AssetDetails, AssetsResponse } from '../types';
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
 * Fetches the latest ledger from Horizon API
 * @param network - Network to query
 * @returns Latest Ledger data from Horizon
 */
export async function fetchLatestLedger(
  network: Network = 'mainnet'
): Promise<Ledger> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/ledgers?order=desc&limit=1`;

  try {
    const response = await axios.get<CollectionResponse<Ledger>>(url, {
      timeout: 10000,
    });
    const records = response.data._embedded.records;
    if (records.length === 0) {
      throw new HorizonError('No ledgers found', 404, 'NOT_FOUND');
    }
    return records[0];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError('No ledgers found', 404, 'NOT_FOUND');
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
 * @param cursor - Pagination cursor
 * @returns Collection of transactions
 */
export async function fetchAccountTransactions(
  accountId: string,
  network: Network = 'mainnet',
  limit: number = 10,
  cursor?: string
): Promise<CollectionResponse<Transaction>> {
  const baseUrl = HORIZON_URLS[network];
  let url = `${baseUrl}/accounts/${accountId}/transactions?limit=${limit}`;
  if (cursor) {
    url += `&cursor=${cursor}`;
  }

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

/**
 * Fetches claimable balances for an account (or all if no account specified)
 * @param accountId - Optional Stellar account ID
 * @param network - Network to query
 * @param limit - Number of claimable balances to fetch
 * @returns Collection of claimable balances
 */
export async function fetchClaimableBalances(
  accountId?: string,
  network: Network = 'mainnet',
  limit: number = 10
): Promise<CollectionResponse<ClaimableBalance>> {
  const baseUrl = HORIZON_URLS[network];
  let url = `${baseUrl}/claimable_balances?limit=${limit}`;
  if (accountId) {
    url = `${baseUrl}/accounts/${accountId}/claimable_balances?limit=${limit}`;
  }

  try {
    const response = await axios.get<CollectionResponse<ClaimableBalance>>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Claimable balances not found`,
          404,
          'NOT_FOUND'
        );
      }
    }
    throw error;
  }
}

/**
 * Fetches Horizon server info from root endpoint
 * @param network - Network to query
 * @returns Horizon server info
 */
export async function fetchHorizonInfo(
  network: Network = 'mainnet'
): Promise<HorizonInfo> {
  const baseUrl = HORIZON_URLS[network];
  const url = baseUrl;

  try {
    const response = await axios.get<HorizonInfo>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Horizon info not found`,
          404,
          'NOT_FOUND'
        );
      }
    }
    throw error;
  }
}

/**
 * Fetches payment paths from Horizon
 * @param sourceAccount - Source account ID
 * @param destinationAccount - Destination account ID
 * @param destinationAmount - Amount to receive
 * @param destinationAsset - Asset to receive (format: "CODE:ISSUER" or "native")
 * @param network - Network to query
 * @returns Pathfind response
 */
export async function fetchPathfind(
  sourceAccount: string,
  destinationAccount: string,
  destinationAmount: string,
  destinationAsset: string,
  network: Network = 'mainnet'
): Promise<PathfindResponse> {
  const baseUrl = HORIZON_URLS[network];
  let url = `${baseUrl}/paths/strict-receive?destination_account=${destinationAccount}&destination_amount=${destinationAmount}&source_account=${sourceAccount}`;
  
  if (destinationAsset !== 'native') {
    const [code, issuer] = destinationAsset.split(':');
    if (!code || !issuer) {
      throw new Error('Invalid destination asset format. Use "CODE:ISSUER" or "native"');
    }
    url += `&destination_asset_type=credit_alphanum${code.length <= 4 ? '4' : '12'}&destination_asset_code=${code}&destination_asset_issuer=${issuer}`;
  }

  try {
    const response = await axios.get<PathfindResponse>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Paths not found`,
          404,
          'NOT_FOUND'
        );
      }
    }
    throw error;
  }
}

/**
 * Fetches operations for an account
 * @param accountId - Account ID
 * @param network - Network to query
 * @param limit - Number of operations to fetch
 * @returns Collection of operations
 */
export async function fetchAccountOperations(
  accountId: string,
  network: Network = 'mainnet',
  limit: number = 10
): Promise<CollectionResponse<Operation>> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/accounts/${accountId}/operations?limit=${limit}`;

  try {
    const response = await axios.get<CollectionResponse<Operation>>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Operations not found`,
          404,
          'NOT_FOUND'
        );
      }
    }
    throw error;
  }
}

/**
 * Fetches trades for an account
 * @param accountId - Account ID
 * @param network - Network to query
 * @param limit - Number of trades to fetch
 * @returns Collection of trades
 */
export async function fetchAccountTrades(
  accountId: string,
  network: Network = 'mainnet',
  limit: number = 10
): Promise<CollectionResponse<Trade>> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/accounts/${accountId}/trades?limit=${limit}`;

  try {
    const response = await axios.get<CollectionResponse<Trade>>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Trades not found`,
          404,
          'NOT_FOUND'
        );
      }
    }
    throw error;
  }
}

/**
 * Fetches order book for a trading pair
 * @param sellingAsset - Selling asset (format: "CODE:ISSUER" or "native")
 * @param buyingAsset - Buying asset (format: "CODE:ISSUER" or "native")
 * @param network - Network to query
 * @param limit - Number of price levels to fetch
 * @returns Order book
 */
export async function fetchOrderbook(
  sellingAsset: string,
  buyingAsset: string,
  network: Network = 'mainnet',
  limit: number = 20
): Promise<Orderbook> {
  const baseUrl = HORIZON_URLS[network];
  let url = `${baseUrl}/order_book?limit=${limit}`;
  
  // Selling asset
  if (sellingAsset === 'native') {
    url += '&selling_asset_type=native';
  } else {
    const [code, issuer] = sellingAsset.split(':');
    url += `&selling_asset_type=credit_alphanum${code.length <= 4 ? '4' : '12'}&selling_asset_code=${code}&selling_asset_issuer=${issuer}`;
  }
  
  // Buying asset
  if (buyingAsset === 'native') {
    url += '&buying_asset_type=native';
  } else {
    const [code, issuer] = buyingAsset.split(':');
    url += `&buying_asset_type=credit_alphanum${code.length <= 4 ? '4' : '12'}&buying_asset_code=${code}&buying_asset_issuer=${issuer}`;
  }

  try {
    const response = await axios.get<Orderbook>(url, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(
          `Order book not found`,
          404,
          'NOT_FOUND'
        );
      }
    }
    throw error;
  }
}

/**
 * Fetches asset details from Horizon API
 * @param code - Asset code
 * @param issuer - Asset issuer account ID
 * @param network - Network to query
 * @returns Asset details from Horizon
 */
export async function fetchAsset(
  code: string,
  issuer: string,
  network: Network = 'mainnet'
): Promise<AssetDetails> {
  const baseUrl = HORIZON_URLS[network];
  const assetType = code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12';
  const url = `${baseUrl}/assets?asset_code=${code}&asset_issuer=${issuer}&asset_type=${assetType}`;

  try {
    const response = await axios.get<AssetsResponse>(url, {
      timeout: 10000,
    });
    const records = response.data._embedded.records;
    if (records.length === 0) {
      throw new HorizonError(`Asset ${code}:${issuer} not found`, 404, 'NOT_FOUND');
    }
    return records[0];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError(`Asset ${code}:${issuer} not found`, 404, 'NOT_FOUND');
      }
      if (error.response) {
        throw new HorizonError(
          error.response.data?.title || `HTTP ${error.response.status}`,
          error.response.status,
          error.response.data?.type || 'HTTP_ERROR',
          error.response.data
        );
      }
    }
    throw error;
  }
}

/**
 * Broadcasts a signed transaction envelope to Horizon API
 * @param xdr - Signed transaction envelope XDR
 * @param network - Network to query
 * @returns Transaction data from Horizon
 */
export async function broadcastTransaction(
  xdr: string,
  network: Network = 'mainnet'
): Promise<Transaction> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/transactions`;

  try {
    const response = await axios.post<Transaction>(url, new URLSearchParams({ tx: xdr }), {
      timeout: 30000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new HorizonError(
          error.response.data?.title || `HTTP ${error.response.status}`,
          error.response.status,
          error.response.data?.type || 'HTTP_ERROR',
          error.response.data
        );
      }
      if (error.request) {
        throw new HorizonError('No response from Horizon server', 0, 'NETWORK_ERROR');
      }
    }
    throw error;
  }
}
