/**
 * Orderbook Command
 * Shows the order book for a trading pair
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchOrderbook, Network } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';

export interface OrderbookOptions {
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

function formatAsset(assetStr: string): string {
  if (assetStr === 'native') {
    return 'XLM';
  }
  const [code, issuer] = assetStr.split(':');
  return `${code}:${truncateMiddle(issuer, 10)}`;
}

function formatOrderbook(selling: string, buying: string, orderbook: any): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('📊 Order Book'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  output.push(chalk.cyan('Selling: ') + chalk.white(formatAsset(selling)));
  output.push(chalk.cyan('Buying: ') + chalk.white(formatAsset(buying)));
  output.push('');

  if (orderbook.bids.length === 0 && orderbook.asks.length === 0) {
    output.push(chalk.gray('No orders found.'));
    output.push('');
    return output.join('\n');
  }

  // Bids table
  if (orderbook.bids.length > 0) {
    output.push(chalk.green('💚 Bids (Buyers):'));
    const bidsTable = new Table({
      head: [
        chalk.blue.bold('Price'),
        chalk.blue.bold('Amount')
      ],
      colWidths: [30, 30],
      style: {
        head: [],
        border: ['gray'],
      },
    });
    orderbook.bids.forEach((bid: any) => {
      bidsTable.push([
        chalk.green(bid.price),
        chalk.white(bid.amount)
      ]);
    });
    output.push(bidsTable.toString());
    output.push('');
  }

  // Asks table
  if (orderbook.asks.length > 0) {
    output.push(chalk.red('🔴 Asks (Sellers):'));
    const asksTable = new Table({
      head: [
        chalk.blue.bold('Price'),
        chalk.blue.bold('Amount')
      ],
      colWidths: [30, 30],
      style: {
        head: [],
        border: ['gray'],
      },
    });
    orderbook.asks.forEach((ask: any) => {
      asksTable.push([
        chalk.red(ask.price),
        chalk.white(ask.amount)
      ]);
    });
    output.push(asksTable.toString());
    output.push('');
  }

  return output.join('\n');
}

export async function orderbookCommand(
  sellingAsset: string,
  buyingAsset: string,
  options: OrderbookOptions
): Promise<void> {
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError('Invalid network "' + options.network + '". Use "mainnet" or "testnet".');
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching order book...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const orderbook = await fetchOrderbook(sellingAsset, buyingAsset, options.network, options.limit);
    spinner.succeed('Order book fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Order Book:'));
      console.log(JSON.stringify(orderbook, null, 2));
    } else {
      console.log(formatOrderbook(sellingAsset, buyingAsset, orderbook));
    }
  } catch (error) {
    spinner.fail('Failed to fetch order book');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerOrderbookCommand(program: Command): void {
  program
    .command('orderbook <selling-asset> <buying-asset>')
    .description('Show order book for a trading pair (use "native" for XLM, or "CODE:ISSUER" for assets)')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .option('-l, --limit <limit>', 'Number of price levels to show (default: 20)', '20')
    .action(async (sellingAsset: string, buyingAsset: string, options: any) => {
      const limit = parseInt(options.limit, 10);
      await orderbookCommand(sellingAsset, buyingAsset, { ...options, limit });
    });
}
