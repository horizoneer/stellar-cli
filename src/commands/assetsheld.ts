/**
 * Assets Held Command
 * Lists all assets held by an account with details
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccount, Network, isAccountId } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';
import { Balance } from '../types';

export interface AssetsHeldOptions {
  network: Network;
  raw: boolean;
}

function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const start = str.slice(0, Math.ceil(maxLength / 2));
  const end = str.slice(str.length - Math.floor(maxLength / 2));
  return start + '...' + end;
}

function formatAssetsHeld(accountId: string, balances: Balance[]): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('💼 Assets Held'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  output.push(chalk.cyan('Account: ') + chalk.white(truncateMiddle(accountId, 30)));
  output.push('');

  if (balances.length === 0) {
    output.push(chalk.gray('No assets held.'));
    output.push('');
    return output.join('\n');
  }

  const table = new Table({
    head: [
      chalk.blue.bold('Asset'),
      chalk.blue.bold('Balance'),
      chalk.blue.bold('Limit'),
      chalk.blue.bold('Authorized')
    ],
    colWidths: [25, 20, 20, 15],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  balances.forEach((balance) => {
    let assetName = 'XLM';
    let isNative = true;
    
    if (balance.asset_type !== 'native') {
      assetName = `${balance.asset_code}:${truncateMiddle(balance.asset_issuer || '', 10)}`;
      isNative = false;
    }

    table.push([
      chalk.white(assetName),
      chalk.cyan(balance.balance),
      isNative ? chalk.gray('N/A') : chalk.gray(balance.limit || 'N/A'),
      isNative ? chalk.gray('N/A') : (balance.is_authorized ? chalk.green('Yes') : chalk.red('No'))
    ]);
  });

  output.push(table.toString());
  output.push('');

  return output.join('\n');
}

export async function assetsHeldCommand(
  accountId: string,
  options: AssetsHeldOptions
): Promise<void> {
  if (!isAccountId(accountId)) {
    printError('Invalid account ID. Must start with G followed by 55 alphanumeric characters.');
    process.exit(1);
  }

  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError('Invalid network "' + options.network + '". Use "mainnet" or "testnet".');
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching assets...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const account = await fetchAccount(accountId, options.network);
    spinner.succeed('Assets fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Account Balances:'));
      console.log(JSON.stringify(account.balances, null, 2));
    } else {
      console.log(formatAssetsHeld(accountId, account.balances));
    }
  } catch (error) {
    spinner.fail('Failed to fetch assets');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerAssetsHeldCommand(program: Command): void {
  program
    .command('assetsheld <account-id>')
    .description('List all assets held by an account with details')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .action(async (accountId: string, options: AssetsHeldOptions) => {
      await assetsHeldCommand(accountId, options);
    });
}
