/**
 * Data command implementation
 * Shows an account's data entries
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccount, Network, isAccountId } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';

export interface DataOptions {
  network: Network;
  raw: boolean;
}

function formatData(accountId: string, data: Record<string, string>): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('📝 Account Data Entries'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  output.push(chalk.cyan('Account: ') + chalk.white(accountId));
  output.push('');

  const keys = Object.keys(data);
  if (keys.length === 0) {
    output.push(chalk.gray('No data entries found for this account.'));
    output.push('');
    return output.join('\n');
  }

  const table = new Table({
    head: [
      chalk.blue.bold('Key'),
      chalk.blue.bold('Value (Base64)'),
      chalk.blue.bold('Decoded')
    ],
    colWidths: [25, 30, 25],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const key of keys) {
    const value = data[key];
    let decoded = 'N/A';
    try {
      decoded = Buffer.from(value, 'base64').toString('utf8');
    } catch (e) {
      decoded = 'Unable to decode';
    }
    table.push([
      chalk.cyan(key),
      chalk.gray(truncateMiddle(value, 28)),
      chalk.white(truncateMiddle(decoded, 23))
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

export async function dataCommand(
  accountId: string,
  options: DataOptions
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
    text: 'Fetching data entries...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const account = await fetchAccount(accountId, options.network);
    spinner.succeed('Data entries fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Data Entries:'));
      console.log(JSON.stringify(account.data, null, 2));
    } else {
      console.log(formatData(accountId, account.data));
    }
  } catch (error) {
    spinner.fail('Failed to fetch data entries');
    const message = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerDataCommand(program: Command): void {
  program
    .command('data <account-id>')
    .description('Show an account\'s data entries')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .action(async (accountId: string, options: DataOptions) => {
      await dataCommand(accountId, options);
    });
}
