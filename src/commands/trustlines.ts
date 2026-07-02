/**
 * Trustlines command implementation
 * Shows an account's trustlines
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccount, Network, isAccountId } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';
import { Balance } from '../types';

export interface TrustlinesOptions {
  network: Network;
  raw: boolean;
}

function formatTrustlines(accountId: string, balances: Balance[]): string {
  const output: string[] = [];

  const trustlines = balances.filter(b => b.asset_type !== 'native' && b.asset_type !== 'liquidity_pool_shares');

  output.push('');
  output.push(chalk.blue.bold('🔗 Account Trustlines'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  output.push(chalk.cyan('Account: ') + chalk.white(accountId));
  output.push('');

  if (trustlines.length === 0) {
    output.push(chalk.gray('No trustlines found for this account.'));
    output.push('');
    return output.join('\n');
  }

  const table = new Table({
    head: [
      chalk.blue.bold('Asset Code'),
      chalk.blue.bold('Issuer'),
      chalk.blue.bold('Balance'),
      chalk.blue.bold('Limit'),
      chalk.blue.bold('Authorized')
    ],
    colWidths: [15, 35, 12, 12, 12],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const tl of trustlines) {
    table.push([
      chalk.white(tl.asset_code || 'N/A'),
      chalk.gray(truncateMiddle(tl.asset_issuer || '', 33)),
      chalk.cyan(tl.balance),
      chalk.gray(tl.limit || 'N/A'),
      tl.is_authorized ? chalk.green('Yes') : chalk.red('No')
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

export async function trustlinesCommand(
  accountId: string,
  options: TrustlinesOptions
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
    text: 'Fetching trustlines...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const account = await fetchAccount(accountId, options.network);
    spinner.succeed('Trustlines fetched successfully!');

    if (options.raw) {
      const trustlines = account.balances.filter(b => b.asset_type !== 'native' && b.asset_type !== 'liquidity_pool_shares');
      console.log('\n' + chalk.bold('Raw Trustlines:'));
      console.log(JSON.stringify(trustlines, null, 2));
    } else {
      console.log(formatTrustlines(accountId, account.balances));
    }
  } catch (error) {
    spinner.fail('Failed to fetch trustlines');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerTrustlinesCommand(program: Command): void {
  program
    .command('trustlines <account-id>')
    .description('Show an account\'s trustlines')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .action(async (accountId: string, options: TrustlinesOptions) => {
      await trustlinesCommand(accountId, options);
    });
}
