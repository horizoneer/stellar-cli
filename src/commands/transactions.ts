/**
 * Transactions command implementation
 * Lists recent transactions for an account
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccountTransactions, Network, isAccountId } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';
import { Transaction } from '../types';

export interface TransactionsOptions {
  network: Network;
  raw: boolean;
  limit: number;
}

function formatTransactions(accountId: string, transactions: Transaction[]): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('📜 Recent Transactions'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  output.push(chalk.cyan('Account: ') + chalk.white(accountId));
  output.push('');

  if (transactions.length === 0) {
    output.push(chalk.gray('No transactions found for this account.'));
    output.push('');
    return output.join('\n');
  }

  const table = new Table({
    head: [
      chalk.blue.bold('Hash'),
      chalk.blue.bold('Operations'),
      chalk.blue.bold('Status'),
      chalk.blue.bold('Created At')
    ],
    colWidths: [30, 12, 10, 18],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const tx of transactions) {
    const status = tx.successful ? chalk.green('Success') : chalk.red('Failed');
    table.push([
      chalk.gray(truncateMiddle(tx.hash, 28)),
      chalk.cyan(String(tx.operation_count)),
      status,
      chalk.white(tx.created_at)
    ]);
  }

  output.push(table.toString());
  output.push('');

  return output.join('\n');
}

function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const start = str.slice(0, Math.ceil(maxLength / 2));
  const end = str.slice(str.length - Math.floor(maxLength / 2));
  return start + '...' + end;
}

export async function transactionsCommand(
  accountId: string,
  options: TransactionsOptions
): Promise<void> {
  if (!isAccountId(accountId)) {
    printError('Invalid Stellar account ID. Must start with G followed by 55 alphanumeric characters.');
    process.exit(1);
  }

  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError('Invalid network "' + options.network + '". Use "mainnet" or "testnet".');
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching transactions...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const response = await fetchAccountTransactions(accountId, options.network, options.limit);
    spinner.succeed('Transactions fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Transactions:'));
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log(formatTransactions(accountId, response._embedded.records));
    }
  } catch (error) {
    spinner.fail('Failed to fetch transactions');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerTransactionsCommand(program: Command): void {
  program
    .command('transactions <account-id>')
    .description('List recent transactions for an account')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .option('-l, --limit <limit>', 'Number of transactions to show (default: 10)', '10')
    .action(async (accountId: string, options: any) => {
      const limit = parseInt(options.limit, 10);
      await transactionsCommand(accountId, { ...options, limit });
    });
}
