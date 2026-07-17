/**
 * Horizon API integration for Stellar Inspector CLI
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Transaction, OperationsResponse, Ledger, CollectionResponse, Account, Operation, ClaimableBalance, HorizonInfo, PathfindResponse, Trade, Orderbook, AssetDetails, AssetsResponse } from '../types';
import { HorizonError } from '../utils/errors';
import { withRetry } from '../utils/retry';
import { setupRateLimitInterceptors } from '../utils/rateLimiter';
import { performanceMonitor } from '../utils/performance';

/**
 * Simple in-memory cache for Horizon API responses
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class HorizonCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private ttl: number = 60000; // 1 minute TTL

  constructor(ttlMs: number = 60000) {
    this.ttl = ttlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Shared cache instance
const cache = new HorizonCache();

/**
 * Horizon API endpoints for different networks
 */
export const HORIZON_URLS = {
  mainnet: process.env.HORIZON_MAINNET_URL || 'https://horizon.stellar.org',
  testnet: process.env.HORIZON_TESTNET_URL || 'https://horizon-testnet.stellar.org',
} as const;

export type Network = keyof typeof HORIZON_URLS;

/**
 * Shared Axios instances for each network
 */
const axiosInstances: Record<Network, AxiosInstance> = {
  mainnet: axios.create({
    baseURL: HORIZON_URLS.mainnet,
    timeout: 10000,
  }),
  testnet: axios.create({
    baseURL: HORIZON_URLS.testnet,
    timeout: 10000,
  }),
};

// Setup rate limit interceptors
setupRateLimitInterceptors(axiosInstances.mainnet);
setupRateLimitInterceptors(axiosInstances.testnet);

/**
 * Helper to get Axios instance for a network
 */
function getAxiosInstance(network: Network): AxiosInstance {
  return axiosInstances[network];
}

/**
 * Helper to generate cache keys
 */
function getCacheKey(network: Network, method: string, url: string, params?: Record<string, unknown>): string {
  const keyParts = [network, method, url];
  if (params) {
    keyParts.push(JSON.stringify(params));
  }
  return keyParts.join(':');
}

/**
 * Common error handling for Horizon API requests
 */
function handleHorizonError(error: unknown, notFoundMessage: string, _network: Network): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 404) {
      throw new HorizonError(
        notFoundMessage,
        404,
        'NOT_FOUND'
      );
    }
    if (axiosError.response) {
      throw new HorizonError(
        (axiosError.response.data as any)?.title || `HTTP ${axiosError.response.status}`,
        axiosError.response.status,
        (axiosError.response.data as any)?.type || 'HTTP_ERROR',
        axiosError.response.data
      );
    }
    if (axiosError.request) {
      throw new HorizonError(
        'No response from Horizon server',
        0,
        'NETWORK_ERROR'
      );
    }
  }
  throw error;
}

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
  const cacheKey = getCacheKey(network, 'GET', `/transactions/${hashOrId}`);
  const cached = cache.get<Transaction>(cacheKey);
  if (cached) return cached;

  const axios = getAxiosInstance(network);
  const url = `/transactions/${hashOrId}`;

  try {
    const startTime = Date.now();
    const response = await withRetry(() => axios.get<Transaction>(url));
    const duration = Date.now() - startTime;
    
    performanceMonitor.recordMetric({
      endpoint: `/transactions/${hashOrId}`,
      duration,
      timestamp: Date.now(),
      success: true,
      statusCode: response.status
    });
    
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error: any) {
    performanceMonitor.recordMetric({
      endpoint: `/transactions/${hashOrId}`,
      duration: 0,
      timestamp: Date.now(),
      success: false,
      statusCode: error.response?.status
    });
    handleHorizonError(error, `Transaction "${hashOrId}" not found on ${network}`, network);
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
  const cacheKey = getCacheKey(network, 'GET', `/transactions/${transactionHash}/operations`);
  const cached = cache.get<OperationsResponse>(cacheKey);
  if (cached) return cached;

  const axios = getAxiosInstance(network);
  const url = `/transactions/${transactionHash}/operations`;

  try {
    const response = await withRetry(() => axios.get<OperationsResponse>(url));
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    handleHorizonError(error, `Operations for transaction "${transactionHash}" not found`, network);
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
  const cacheKey = getCacheKey(network, 'GET', `/ledgers/${sequence}`);
  const cached = cache.get<Ledger>(cacheKey);
  if (cached) return cached;

  const axios = getAxiosInstance(network);
  const url = `/ledgers/${sequence}`;

  try {
    const response = await axios.get<Ledger>(url);
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    handleHorizonError(error, `Ledger "${sequence}" not found on ${network}`, network);
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
  const axios = getAxiosInstance(network);
  const url = `/ledgers?order=desc&limit=1`;

  try {
    const response = await axios.get<CollectionResponse<Ledger>>(url);
    const records = response.data._embedded.records;
    if (records.length === 0) {
      throw new HorizonError('No ledgers found', 404, 'NOT_FOUND');
    }
    return records[0];
  } catch (error) {
    handleHorizonError(error, 'No ledgers found', network);
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
  const cacheKey = getCacheKey(network, 'GET', `/accounts/${accountId}`);
  const cached = cache.get<Account>(cacheKey);
  if (cached) return cached;

  const axios = getAxiosInstance(network);
  const url = `/accounts/${accountId}`;

  try {
    const response = await withRetry(() => axios.get<Account>(url));
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    handleHorizonError(error, `Account "${accountId}" not found on ${network}`, network);
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
  const axios = getAxiosInstance(network);
  let url = `/accounts/${accountId}/transactions?limit=${limit}`;
  if (cursor) {
    url += `&cursor=${cursor}`;
  }

  try {
    const response = await axios.get<CollectionResponse<Transaction>>(url);
    return response.data;
  } catch (error) {
    handleHorizonError(error, `Transactions for account "${accountId}" not found`, network);
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
  const axios = getAxiosInstance(network);
  const url = `/accounts/${accountId}/payments?limit=${limit}`;

  try {
    const response = await axios.get<CollectionResponse<Operation>>(url);
    return response.data;
  } catch (error) {
    handleHorizonError(error, `Payments for account "${accountId}" not found`, network);
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
  const axios = getAxiosInstance(network);
  let url = `/claimable_balances?limit=${limit}`;
  if (accountId) {
    url = `/accounts/${accountId}/claimable_balances?limit=${limit}`;
  }

  try {
    const response = await axios.get<CollectionResponse<ClaimableBalance>>(url);
    return response.data;
  } catch (error) {
    handleHorizonError(error, `Claimable balances not found`, network);
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
  const cacheKey = getCacheKey(network, 'GET', '');
  const cached = cache.get<HorizonInfo>(cacheKey);
  if (cached) return cached;

  const axios = getAxiosInstance(network);
  const url = '';

  try {
    const response = await axios.get<HorizonInfo>(url);
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    handleHorizonError(error, `Horizon info not found`, network);
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
  const axios = getAxiosInstance(network);
  let url = `/paths/strict-receive?destination_account=${destinationAccount}&destination_amount=${destinationAmount}&source_account=${sourceAccount}`;
  
  if (destinationAsset !== 'native') {
    const [code, issuer] = destinationAsset.split(':');
    if (!code || !issuer) {
      throw new Error('Invalid destination asset format. Use "CODE:ISSUER" or "native"');
    }
    url += `&destination_asset_type=credit_alphanum${code.length <= 4 ? '4' : '12'}&destination_asset_code=${code}&destination_asset_issuer=${issuer}`;
  }

  try {
    const response = await axios.get<PathfindResponse>(url);
    return response.data;
  } catch (error) {
    handleHorizonError(error, `Paths not found`, network);
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
  const axios = getAxiosInstance(network);
  const url = `/accounts/${accountId}/operations?limit=${limit}`;

  try {
    const response = await axios.get<CollectionResponse<Operation>>(url);
    return response.data;
  } catch (error) {
    handleHorizonError(error, `Operations not found`, network);
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
  const axios = getAxiosInstance(network);
  const url = `/accounts/${accountId}/trades?limit=${limit}`;

  try {
    const response = await axios.get<CollectionResponse<Trade>>(url);
    return response.data;
  } catch (error) {
    handleHorizonError(error, `Trades not found`, network);
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
  const axios = getAxiosInstance(network);
  let url = `/order_book?limit=${limit}`;
  
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
    const response = await axios.get<Orderbook>(url);
    return response.data;
  } catch (error) {
    handleHorizonError(error, `Order book not found`, network);
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
  const assetType = code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12';
  const params = { asset_code: code, asset_issuer: issuer, asset_type: assetType };
  const cacheKey = getCacheKey(network, 'GET', '/assets', params);
  const cached = cache.get<AssetDetails>(cacheKey);
  if (cached) return cached;

  const axios = getAxiosInstance(network);
  const url = `/assets?asset_code=${code}&asset_issuer=${issuer}&asset_type=${assetType}`;

  try {
    const response = await axios.get<AssetsResponse>(url);
    const records = response.data._embedded.records;
    if (records.length === 0) {
      throw new HorizonError(`Asset ${code}:${issuer} not found`, 404, 'NOT_FOUND');
    }
    cache.set(cacheKey, records[0]);
    return records[0];
  } catch (error) {
    handleHorizonError(error, `Asset ${code}:${issuer} not found`, network);
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
  const axios = getAxiosInstance(network);
  const url = `/transactions`;

  try {
    const response = await axios.post<Transaction>(url, new URLSearchParams({ tx: xdr }), {
      timeout: 30000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  } catch (error) {
    handleHorizonError(error, 'Failed to broadcast transaction', network);
  }
}
