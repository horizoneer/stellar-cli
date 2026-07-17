/**
 * Enhanced error recovery with fallback mechanisms
 */

import logger from './logger';
import { Network, HORIZON_URLS } from '../core/horizon';

export interface FallbackOptions {
  enableFallback?: boolean;
  fallbackNetworks?: Network[];
  maxFallbackAttempts?: number;
}

const defaultOptions: Required<FallbackOptions> = {
  enableFallback: true,
  fallbackNetworks: ['testnet', 'mainnet'],
  maxFallbackAttempts: 2,
};

/**
 * Execute a function with fallback to alternative networks or endpoints
 */
export async function withFallback<T>(
  fn: (network: Network) => Promise<T>,
  primaryNetwork: Network,
  options: FallbackOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  
  if (!opts.enableFallback) {
    return fn(primaryNetwork);
  }

  const networksToTry = [primaryNetwork, ...opts.fallbackNetworks.filter(n => n !== primaryNetwork)];
  let lastError: any;

  for (let attempt = 0; attempt < networksToTry.length; attempt++) {
    const network = networksToTry[attempt];
    
    try {
      logger.info(`Attempting operation on ${network} (attempt ${attempt + 1}/${networksToTry.length})`);
      const result = await fn(network);
      
      if (attempt > 0) {
        logger.info(`Fallback successful on ${network}`);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      logger.warn(`Operation failed on ${network}: ${error.message}`);
      
      // Don't fallback on 404 errors (resource not found)
      if (error.response?.status === 404) {
        logger.info('Resource not found, skipping fallback');
        throw error;
      }
      
      // Don't fallback on validation errors
      if (error.response?.status === 400) {
        logger.info('Validation error, skipping fallback');
        throw error;
      }
    }
  }

  logger.error(`All fallback attempts exhausted`);
  throw lastError;
}

/**
 * Execute a function with multiple strategy fallbacks
 */
export async function withStrategyFallback<T>(
  strategies: Array<{ name: string; fn: () => Promise<T> }>
): Promise<T> {
  let lastError: any;

  for (const strategy of strategies) {
    try {
      logger.info(`Attempting strategy: ${strategy.name}`);
      const result = await strategy.fn();
      logger.info(`Strategy ${strategy.name} succeeded`);
      return result;
    } catch (error: any) {
      lastError = error;
      logger.warn(`Strategy ${strategy.name} failed: ${error.message}`);
    }
  }

  logger.error('All strategies failed');
  throw lastError;
}

/**
 * Get alternative Horizon URLs for a network
 */
export function getAlternativeHorizonUrls(network: Network): string[] {
  const alternatives: Record<Network, string[]> = {
    mainnet: [
      'https://horizon.stellar.org',
      'https://horizon-mainnet.stellar.org',
    ],
    testnet: [
      'https://horizon-testnet.stellar.org',
    ],
  };
  
  return alternatives[network] || [];
}

/**
 * Execute with endpoint fallback
 */
export async function withEndpointFallback<T>(
  fn: (baseUrl: string) => Promise<T>,
  network: Network
): Promise<T> {
  const endpoints = getAlternativeHorizonUrls(network);
  let lastError: any;

  for (const endpoint of endpoints) {
    try {
      logger.info(`Attempting endpoint: ${endpoint}`);
      const result = await fn(endpoint);
      logger.info(`Endpoint ${endpoint} succeeded`);
      return result;
    } catch (error: any) {
      lastError = error;
      logger.warn(`Endpoint ${endpoint} failed: ${error.message}`);
    }
  }

  logger.error('All endpoints failed');
  throw lastError;
}
