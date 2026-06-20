/**
 * Balances command implementation
 * Shows an account's current balances
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccount, Network, isAccountId } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';
import { Account } from '../types';

export interface BalancesOptions {
  network: Network;
  raw: boolean;
}

function formatBalances(account: Account): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('💰 Account Balances'));
  output.push(chalk.gray('─'.repeat(50)));
  output.push('');
  output.push(chalk.cyan('Account: ') + chalk.white(account.account_id));
  output.push('');

  const table = new Table({
    head: [
      chalk.blue.bold('Asset'),
      chalk.blue.bold('Balance'),
      chalk.blue.bold('Type')
    ],
    colWidths: [25, 20, 15],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const balance of account.balances) {
    let assetName = 'XLM';
    let assetType = 'Native';

    if (balance.asset_type !== 'native') {
      assetName = balance.asset_code + ' (' + truncateMiddle(balance.asset_issuer || '', 15) + ')';
      assetType = balance.asset_type === 'credit_alphanum4' ? 'Credit (4)' : 'Credit (12)';
    }

    table.push([
      chalk.white(assetName),
      chalk.cyan(balance.balance),
      chalk.gray(assetType)
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

export async function balancesCommand(
  accountId: string,
  options: BalancesOptions
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
    text: 'Fetching account balances...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const account = await fetchAccount(accountId, options.network);
    spinner.succeed('Balances fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Account Data:'));
      console.log(JSON.stringify(account, null, 2));
    } else {
      console.log(formatBalances(account));
    }
  } catch (error) {
    spinner.fail('Failed to fetch balances');
    const message = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerBalancesCommand(program: Command): void {
  program
    .command('balances <account-id>')
    .description('Show an account\'s current balances')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .action(async (accountId: string, options: BalancesOptions) => {
      await balancesCommand(accountId, options);
    });
}
