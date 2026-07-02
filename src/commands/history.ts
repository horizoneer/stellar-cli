/**
 * History command implementation
 * Fetches and displays transaction history for an account
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccountTransactions, Network, isAccountId } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';
import { Transaction } from '../types';

export interface HistoryOptions {
  network: Network;
  raw: boolean;
  limit: number;
  cursor?: string;
}

function formatHistory(accountId: string, response: any): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('📜 Transaction History'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  output.push(chalk.cyan('Account: ') + chalk.white(accountId));
  output.push('');

  const transactions = response._embedded.records;
  if (transactions.length === 0) {
    output.push(chalk.gray('No transactions found for this account.'));
    output.push('');
    return output.join('\n');
  }

  const table = new Table({
    head: [
      chalk.blue.bold('Hash'),
      chalk.blue.bold('Source'),
      chalk.blue.bold('Operations'),
      chalk.blue.bold('Status'),
      chalk.blue.bold('Created At'),
    ],
    colWidths: [25, 25, 12, 10, 18],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const tx of transactions) {
    const status = tx.successful ? chalk.green('Success') : chalk.red('Failed');
    table.push([
      chalk.gray(truncateMiddle(tx.hash, 23)),
      chalk.gray(truncateMiddle(tx.source_account, 23)),
      chalk.cyan(String(tx.operation_count)),
      status,
      chalk.white(tx.created_at),
    ]);
  }

  output.push(table.toString());
  output.push('');

  // Show next page cursor if available
  if (response._links.next?.href) {
    const nextCursor = new URL(response._links.next.href).searchParams.get('cursor');
    if (nextCursor) {
      output.push(chalk.cyan(`Next page cursor: ${nextCursor}`));
      output.push(chalk.gray(`Use --cursor ${nextCursor} to fetch older transactions`));
      output.push('');
    }
  }

  return output.join('\n');
}

function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const start = str.slice(0, Math.ceil(maxLength / 2) - 1);
  const end = str.slice(str.length - Math.floor(maxLength / 2) + 1);
  return start + '...' + end;
}

export async function historyCommand(
  accountId: string,
  options: HistoryOptions
): Promise<void> {
  if (!isAccountId(accountId)) {
    printError('Invalid Stellar account ID. Must start with G followed by 55 alphanumeric characters.');
    process.exit(1);
  }

  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use 'mainnet' or 'testnet'.`);
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching transaction history...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const response = await fetchAccountTransactions(accountId, options.network, options.limit, options.cursor);
    spinner.succeed('Transaction history retrieved!');

    if (options.raw) {
      console.log('');
      console.log(chalk.bold('Raw Response:'));
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log(formatHistory(accountId, response));
    }
  } catch (error) {
    spinner.fail('Failed to fetch transaction history');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerHistoryCommand(program: Command): void {
  program
    .command('history <account-address>')
    .description('Fetch and display transaction history for an account')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .option('-l, --limit <limit>', 'Number of transactions to show (default: 10)', '10')
    .option('-c, --cursor <cursor>', 'Pagination cursor for older transactions')
    .action(async (accountId: string, options: any) => {
      const limit = parseInt(options.limit, 10);
      await historyCommand(accountId, { ...options, limit });
    });
}
