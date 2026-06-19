/**
 * Terminal output formatting utilities
 * Creates beautiful, colored CLI output using cli-table3 and chalk
 */

import Table from 'cli-table3';
import chalk from 'chalk';
import { DecodedTransaction, DecodedOperation } from './decoder';

/**
 * Formats a decoded transaction for terminal display
 * Creates beautiful ASCII tables with colored output
 * @param tx - Decoded transaction data
 * @param operations - Array of decoded operations
 * @param showRaw - Whether to include raw data hint
 * @returns Formatted string for terminal output
 */
export function formatTransaction(
  tx: DecodedTransaction,
  operations: DecodedOperation[],
  showRaw: boolean = false
): string {
  const output: string[] = [];

  // Header with icon
  output.push('');
  output.push(chalk.blue.bold('📡 Stellar Transaction Inspector'));
  output.push(chalk.gray('─'.repeat(50)));
  output.push('');

  // Transaction Details Table
  const txTable = createTransactionTable(tx);
  output.push(txTable.toString());
  output.push('');

  // Operations Table
  if (operations.length > 0) {
    output.push(chalk.cyan.bold('Operations'));
    output.push(chalk.gray('─'.repeat(50)));
    const opsTable = createOperationsTable(operations);
    output.push(opsTable.toString());
    output.push('');
  }

  // Pro tip
  if (!showRaw) {
    output.push(chalk.gray('💡 Pro tip: Use --raw flag to see complete JSON response'));
    output.push('');
  }

  return output.join('\n');
}

/**
 * Creates a formatted table for transaction details
 */
function createTransactionTable(tx: DecodedTransaction): Table.Table {
  const table = new Table({
    head: [chalk.blue.bold('Field'), chalk.blue.bold('Value')],
    colWidths: [15, 65],
    style: {
      head: [],
      border: ['gray'],
    },
    chars: {
      top: '─',
      'top-mid': '┬',
      'top-left': '┌',
      'top-right': '┐',
      bottom: '─',
      'bottom-mid': '┴',
      'bottom-left': '└',
      'bottom-right': '┘',
      left: '│',
      'left-mid': '├',
      mid: '─',
      'mid-mid': '┼',
      right: '│',
      'right-mid': '┤',
      middle: '│',
    },
  });

  // Status with color coding
  const statusDisplay = tx.status === 'success'
    ? chalk.green('✓ Success')
    : chalk.yellow('✗ Failed');

  // Truncate long values for display
  const truncatedHash = truncateMiddle(tx.hash, 20);
  const truncatedSource = truncateMiddle(tx.sourceAccount, 20);

  table.push(
    { [chalk.cyan('Hash')]: chalk.white(truncatedHash) },
    { [chalk.cyan('Source')]: chalk.gray(truncatedSource) },
    { [chalk.cyan('Fee')]: chalk.white(tx.fee) },
    { [chalk.cyan('Memo')]: chalk.gray(tx.memo) },
    { [chalk.cyan('Status')]: statusDisplay },
    { [chalk.cyan('Created')]: chalk.gray(tx.createdAt) }
  );

  return table;
}

/**
 * Creates a formatted table for operations
 */
function createOperationsTable(operations: DecodedOperation[]): Table.Table {
  const table = new Table({
    head: [
      chalk.blue.bold('#'),
      chalk.blue.bold('Type'),
      chalk.blue.bold('Description'),
    ],
    colWidths: [5, 20, 55],
    style: {
      head: [],
      border: ['gray'],
    },
    chars: {
      top: '─',
      'top-mid': '┬',
      'top-left': '┌',
      'top-right': '┐',
      bottom: '─',
      'bottom-mid': '┴',
      'bottom-left': '└',
      'bottom-right': '┘',
      left: '│',
      'left-mid': '├',
      mid: '─',
      'mid-mid': '┼',
      right: '│',
      'right-mid': '┤',
      middle: '│',
    },
  });

  operations.forEach((op, index) => {
    const num = chalk.gray(`#${index + 1}`);
    const type = chalk.cyan(op.type);
    const desc = chalk.white(truncateEnd(op.description, 52));
    table.push([num, type, desc]);
  });

  return table;
}

/**
 * Formats operation details for detailed view
 * @param operation - Decoded operation
 * @returns Formatted details string
 */
export function formatOperationDetails(operation: DecodedOperation): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.cyan.bold(`Operation: ${operation.type}`));
  output.push(chalk.gray('─'.repeat(50)));

  const detailsTable = new Table({
    head: [chalk.blue.bold('Field'), chalk.blue.bold('Value')],
    colWidths: [20, 60],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const [key, value] of Object.entries(operation.details)) {
    detailsTable.push({
      [chalk.cyan(key)]: chalk.gray(String(value)),
    });
  }

  output.push(detailsTable.toString());
  output.push('');

  return output.join('\n');
}

/**
 * Truncates a string in the middle with ellipsis
 * Useful for long hashes and addresses
 */
function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const start = str.slice(0, Math.ceil(maxLength / 2));
  const end = str.slice(str.length - Math.floor(maxLength / 2));
  return `${start}...${end}`;
}

/**
 * Truncates a string at the end with ellipsis
 */
function truncateEnd(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Prints a simple success message
 */
export function printSuccess(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Prints a simple error message
 */
export function printError(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * Prints an info message
 */
export function printInfo(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}
