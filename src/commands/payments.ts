/**
 * Payments command implementation
 * Lists recent payments for an account
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccountPayments, Network, isAccountId } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';
import { Operation } from '../types';

export interface PaymentsOptions {
  network: Network;
  raw: boolean;
  limit: number;
}

function formatPayments(accountId: string, payments: Operation[]): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('💳 Recent Payments'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  output.push(chalk.cyan('Account: ') + chalk.white(accountId));
  output.push('');

  if (payments.length === 0) {
    output.push(chalk.gray('No payments found for this account.'));
    output.push('');
    return output.join('\n');
  }

  const table = new Table({
    head: [
      chalk.blue.bold('Type'),
      chalk.blue.bold('From'),
      chalk.blue.bold('To'),
      chalk.blue.bold('Amount'),
      chalk.blue.bold('Created At')
    ],
    colWidths: [12, 20, 20, 12, 16],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const payment of payments) {
    let from = payment.source_account ? truncateMiddle(payment.source_account, 18) : 'N/A';
    let to = 'N/A';
    let amount = 'N/A';
    let type = payment.type;

    if (payment.type === 'payment' || payment.type === 'path_payment_strict_receive' || payment.type === 'path_payment_strict_send') {
      to = truncateMiddle((payment as any).to || '', 18);
      const assetCode = (payment as any).asset_code || 'XLM';
      amount = (payment as any).amount + ' ' + assetCode;
    }

    table.push([
      chalk.cyan(type),
      chalk.gray(from),
      chalk.gray(to),
      chalk.white(amount),
      chalk.white(payment.created_at)
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

export async function paymentsCommand(
  accountId: string,
  options: PaymentsOptions
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
    text: 'Fetching payments...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const response = await fetchAccountPayments(accountId, options.network, options.limit);
    spinner.succeed('Payments fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Payments:'));
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log(formatPayments(accountId, response._embedded.records));
    }
  } catch (error) {
    spinner.fail('Failed to fetch payments');
    const message = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerPaymentsCommand(program: Command): void {
  program
    .command('payments <account-id>')
    .description('List recent payments for an account')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .option('-l, --limit <limit>', 'Number of payments to show (default: 10)', '10')
    .action(async (accountId: string, options: any) => {
      const limit = parseInt(options.limit, 10);
      await paymentsCommand(accountId, { ...options, limit });
    });
}
