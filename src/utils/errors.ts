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
  public readonly data?: any;

  constructor(message: string, statusCode: number, code: string = 'HORIZON_ERROR', data?: any) {
    super(message);
    this.name = 'HorizonError';
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
  }
}

/**
 * Handles and formats errors for CLI output
 * @param error - The error to handle
 * @returns User-friendly error message
 */
export function handleError(error: unknown): { message: string; data?: any } {
  if (error instanceof HorizonError) {
    // Handle specific Horizon errors
    let message = '';
    switch (error.statusCode) {
      case 404:
        message = `Not found: ${error.message}`;
        break;
      case 400:
        message = `Bad request: ${error.message}`;
        break;
      case 401:
        message = `Unauthorized: ${error.message}`;
        break;
      case 429:
        message = `Rate limited: Please wait before making more requests`;
        break;
      case 500:
        message = `Server error: Horizon is temporarily unavailable`;
        break;
      default:
        message = `Horizon error (${error.statusCode}): ${error.message}`;
    }
    return { message, data: error.data };
  }

  if (error instanceof Error) {
    // Generic error handling
    let message = '';
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      message = `Network error: Unable to connect to Horizon server`;
    } else {
      message = `Error: ${error.message}`;
    }
    return { message };
  }

  return { message: `Unknown error occurred` };
}
