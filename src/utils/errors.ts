/**
 * Error handling utilities for Stellar Inspector CLI
 */

/**
 * Custom error class for Horizon API errors
 * Wraps API errors with user-friendly messages
 */
export class HorizonError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string = 'HORIZON_ERROR') {
    super(message);
    this.name = 'HorizonError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Handles and formats errors for CLI output
 * @param error - The error to handle
 * @returns User-friendly error message
 */
export function handleError(error: unknown): string {
  if (error instanceof HorizonError) {
    // Handle specific Horizon errors
    switch (error.statusCode) {
      case 404:
        return `Not found: ${error.message}`;
      case 400:
        return `Bad request: ${error.message}`;
      case 401:
        return `Unauthorized: ${error.message}`;
      case 429:
        return `Rate limited: Please wait before making more requests`;
      case 500:
        return `Server error: Horizon is temporarily unavailable`;
      default:
        return `Horizon error (${error.statusCode}): ${error.message}`;
    }
  }

  if (error instanceof Error) {
    // Generic error handling
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return `Network error: Unable to connect to Horizon server`;
    }
    return `Error: ${error.message}`;
  }

  return `Unknown error occurred`;
}
