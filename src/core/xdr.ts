/**
 * XDR decoding and validation utilities for Stellar Inspector CLI
 */

import chalk from 'chalk';

/**
 * Represents a decoded XDR transaction envelope
 */
export interface DecodedXdrEnvelope {
  type: string;
  sourceAccount: string;
  fee: number;
  sequence: string;
  operations: DecodedXdrOperation[];
  signatures: string[];
  memo?: DecodedMemo;
  timeBounds?: {
    minTime: string;
    maxTime: string;
  };
}

/**
 * Represents a decoded operation from XDR
 */
export interface DecodedXdrOperation {
  type: string;
  sourceAccount?: string;
  body: Record<string, unknown>;
}

/**
 * Represents a decoded memo
 */
export interface DecodedMemo {
  type: string;
  value: string;
}

/**
 * Validates if a string is valid base64
 * @param input - String to validate
 * @returns true if valid base64
 */
export function isBase64(input: string): boolean {
  try {
    return Buffer.from(input, 'base64').toString('base64') === input;
  } catch {
    return false;
  }
}

/**
 * Validates XDR format
 * @param xdr - XDR string to validate
 * @returns Validation result with error message if invalid
 */
export function validateXdr(xdr: string): { valid: boolean; error?: string } {
  if (!xdr || xdr.trim().length === 0) {
    return { valid: false, error: 'XDR string is empty' };
  }

  if (!isBase64(xdr.trim())) {
    return { valid: false, error: 'XDR must be valid base64 encoded string' };
  }

  // Try to decode the base64
  try {
    const decoded = Buffer.from(xdr.trim(), 'base64');
    if (decoded.length < 4) {
      return { valid: false, error: 'XDR payload is too short' };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Failed to decode XDR: ${error}` };
  }
}

/**
 * Decodes a transaction envelope XDR (simplified version)
 * Note: For full decoding, use @stellar/stellar-sdk
 * @param xdr - Transaction envelope XDR
 * @returns Decoded envelope information
 */
export function decodeTransactionEnvelope(xdr: string): DecodedXdrEnvelope {
  // This is a simplified decoder - for production use stellar-sdk
  const decoded = Buffer.from(xdr, 'base64');

  return {
    type: 'TransactionV1Envelope',
    sourceAccount: 'Requires stellar-sdk for full decoding',
    fee: 0,
    sequence: '0',
    operations: [],
    signatures: [],
    memo: { type: 'none', value: '' },
  };
}

/**
 * Formats XDR output for display
 * @param xdr - XDR string
 * @param title - Title for the output
 * @returns Formatted string for display
 */
export function formatXdrOutput(xdr: string, title: string): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.blue.bold(`📋 ${title}`));
  lines.push(chalk.gray('─'.repeat(50)));
  lines.push('');

  const validation = validateXdr(xdr);

  if (!validation.valid) {
    lines.push(chalk.red(`✗ Invalid XDR: ${validation.error}`));
    lines.push('');
    return lines.join('\n');
  }

  lines.push(chalk.green('✓ Valid base64 encoded XDR'));
  lines.push('');

  // Show raw XDR (truncated if too long)
  const displayXdr = xdr.length > 100 ? `${xdr.slice(0, 100)}...` : xdr;
  lines.push(chalk.cyan('Raw XDR:'));
  lines.push(chalk.gray(displayXdr));
  lines.push('');

  // Show decoded length
  const decoded = Buffer.from(xdr, 'base64');
  lines.push(chalk.cyan('Payload Size:'));
  lines.push(chalk.gray(`${decoded.length} bytes`));
  lines.push('');

  lines.push(chalk.gray('💡 For full XDR decoding, install @stellar/stellar-sdk'));
  lines.push('');

  return lines.join('\n');
}
