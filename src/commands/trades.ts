/**
 * Trades Command
 * Lists recent trades for an account
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccountTrades, Network, isAccountId } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';
import { Trade } from '../types';

export interface TradesOptions {
  network: Network;
  raw: boolean;
  limit: number;
}

function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const start = str.slice(0, Math.ceil(maxLength / 2));
  const end = str.slice(str.length - Math.floor(maxLength / 2));
  return start + '...' + end;
}

function formatAsset(assetType: string, assetCode?: string, assetIssuer?: string): string {
  if (assetType === 'native') {
    return 'XLM';
  }
  return `${assetCode}:${truncateMiddle(assetIssuer || '', 10)}`;
}

function formatTrades(accountId: string, trades: Trade[]): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('📈 Recent Trades'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  output.push(chalk.cyan('Account: ') + chalk.white(truncateMiddle(accountId, 30)));
  output.push('');

  if (trades.length === 0) {
    output.push(chalk.gray('No trades found.'));
    output.push('');
    return output.join('\n');
  }

  const table = new Table({
    head: [
      chalk.blue.bold('Base Asset'),
      chalk.blue.bold('Base Amount'),
      chalk.blue.bold('Counter Asset'),
      chalk.blue.bold('Counter Amount'),
      chalk.blue.bold('Created At')
    ],
    colWidths: [20, 15, 20, 18, 20],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  trades.forEach((trade) => {
    table.push([
      chalk.white(formatAsset(trade.base_asset_type, trade.base_asset_code, trade.base_asset_issuer)),
      chalk.cyan(trade.base_amount),
      chalk.white(formatAsset(trade.counter_asset_type, trade.counter_asset_code, trade.counter_asset_issuer)),
      chalk.cyan(trade.counter_amount),
      chalk.gray(trade.ledger_close_time)
    ]);
  });

  output.push(table.toString());
  output.push('');

  return output.join('\n');
}

export async function tradesCommand(
  accountId: string,
  options: TradesOptions
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
    text: 'Fetching trades...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const response = await fetchAccountTrades(accountId, options.network, options.limit);
    spinner.succeed('Trades fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Trades:'));
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log(formatTrades(accountId, response._embedded.records));
    }
  } catch (error) {
    spinner.fail('Failed to fetch trades');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerTradesCommand(program: Command): void {
  program
    .command('trades <account-id>')
    .description('List recent trades for an account')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .option('-l, --limit <limit>', 'Number of trades to show (default: 10)', '10')
    .action(async (accountId: string, options: any) => {
      const limit = parseInt(options.limit, 10);
      await tradesCommand(accountId, { ...options, limit });
    });
}
