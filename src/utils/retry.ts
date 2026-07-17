/**
 * Exponential backoff retry utility for API calls
 */

import logger from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: any) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: (error: any) => {
    // Retry on network errors, 5xx errors, and rate limiting
    if (!error.response) {
      // Network error (no response)
      return true;
    }
    const status = error.response?.status;
    return status >= 500 || status === 429 || status === 408;
  },
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = Math.min(
    options.initialDelay * Math.pow(options.backoffMultiplier, attempt),
    options.maxDelay
  );
  // Add jitter to avoid thundering herd
  return delay * (0.5 + Math.random());
}

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateDelay(attempt - 1, opts);
        logger.info(`Retry attempt ${attempt}/${opts.maxRetries} after ${Math.round(delay)}ms delay`);
        await sleep(delay);
      }

      const result = await fn();
      if (attempt > 0) {
        logger.info(`Success after ${attempt} retry attempts`);
      }
      return result;
    } catch (error) {
      lastError = error;
      const errorObj = error as any;
      
      if (attempt === opts.maxRetries || !opts.retryableErrors(errorObj)) {
        logger.error(`Max retries (${opts.maxRetries}) exceeded or error not retryable`, {
          error: errorObj.message,
          attempt: attempt + 1,
        });
        throw error;
      }

      logger.warn(`Attempt ${attempt + 1} failed, retrying...`, {
        error: errorObj.message,
        status: errorObj.response?.status,
      });
    }
  }

  throw lastError;
}
