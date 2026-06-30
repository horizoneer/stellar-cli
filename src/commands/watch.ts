/**
 * Watch command implementation
 * Watches an account for new transactions and streams them live
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { Network, HORIZON_URLS, fetchTransaction, fetchOperations } from '../core/horizon';
import { decodeTransaction, decodeOperation } from '../core/decoder';
import { formatTransaction, printError, printInfo } from '../core/formatter';
import { readConfig } from '../core/config';
import { handleError } from '../utils/errors';

// Require EventSource for CommonJS compatibility
const EventSource = require('eventsource');

/**
 * Watch command options
 */
export interface WatchOptions {
  network: Network;
  limit: number;
}

/**
 * Truncates a string in the middle
 */
function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, Math.ceil(maxLen / 2))}...${str.slice(-Math.floor(maxLen / 2))}`;
}

/**
 * Watch command implementation
 * Watches an account and streams new transactions
 * @param accountId - Stellar account ID (G...)
 * @param options - Command options
 */
export async function watchCommand(
  accountId: string,
  options: WatchOptions
): Promise<void> {
  // Load config file
  const config = readConfig();

  // Merge config with options
  const network = (options.network as Network) || (config.network as Network) || 'mainnet';

  // Validate network option
  if (network !== 'mainnet' && network !== 'testnet') {
    printError(`Invalid network "${network}". Use 'mainnet' or 'testnet'.`);
    process.exit(1);
  }

  // Validate account ID format
  if (!accountId.startsWith('G') || accountId.length !== 56) {
    printError('Invalid account ID. Must be a valid Stellar public key (starts with G, 56 characters).');
    process.exit(1);
  }

  const baseUrl = HORIZON_URLS[network];
  const endpoint = `${baseUrl}/accounts/${accountId}/transactions?cursor=now`;

  console.log('');
  console.log(chalk.blue.bold('👁 Stellar Account Watcher'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log('');
  console.log(chalk.cyan(`Account: ${truncateMiddle(accountId, 30)}`));
  console.log(chalk.cyan(`Network: ${network.toUpperCase()}`));
  if (options.limit > 0) {
    console.log(chalk.gray(`Limit: ${options.limit} transactions`));
  }
  console.log('');
  console.log(chalk.gray('Press Ctrl+C to stop watching...'));
  console.log('');

  let eventCount = 0;

  try {
    const es = new EventSource(endpoint);

    es.onopen = () => {
      printInfo('Connected to Horizon, watching for transactions...');
      console.log('');
    };

    es.onerror = (err: any) => {
      printError(`Error connecting to Horizon: ${err.message}`);
      es.close();
      process.exit(1);
    };

    es.onmessage = async (event: any) => {
      if (event.data === '""hello""' || event.data === '"hello"') {
        return;
      }

      try {
        const transaction = JSON.parse(event.data);
        eventCount++;

        const timestamp = new Date().toLocaleTimeString();
        console.log(chalk.yellow.bold(`[${timestamp}] New Transaction #${eventCount}`));
        console.log(chalk.gray('─'.repeat(50)));

        // Fetch and display full transaction details
        const spinner = ora({
          text: 'Fetching transaction details...',
          spinner: 'dots',
          color: 'cyan',
        }).start();

        try {
          const fullTx = await fetchTransaction(transaction.hash, network);
          const operationsResponse = await fetchOperations(transaction.hash, network);
          spinner.succeed('Transaction details fetched!');

          const decodedTx = decodeTransaction(fullTx);
          const decodedOps = operationsResponse._embedded.records.map(decodeOperation);
          console.log(formatTransaction(decodedTx, decodedOps, true));

          // Check limit
          if (options.limit > 0 && eventCount >= options.limit) {
            console.log('');
            printInfo(`Reached limit of ${options.limit} transactions. Stopping.`);
            es.close();
            process.exit(0);
          }
        } catch (err) {
          spinner.fail('Failed to fetch transaction details');
          console.log(chalk.gray(`  Hash: ${truncateMiddle(transaction.hash, 30)}`));
          console.log('');
        }
      } catch (parseErr) {
        // Skip malformed events
      }
    };
  } catch (error) {
    printError('Failed to start watcher');
    const message = handleError(error);
    printError(message);
    process.exit(1);
  }
}

/**
 * Registers the watch command with the CLI
 * @param program - Commander program instance
 */
export function registerWatchCommand(program: Command): void {
  program
    .command('watch <account-id>')
    .description('Watch an account for new transactions and stream them live')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-l, --limit <number>', 'Stop after N transactions (0 for unlimited)', '0')
    .action(async (accountId: string, options: WatchOptions) => {
      options.limit = parseInt(String(options.limit), 10);
      await watchCommand(accountId, options);
    });
}
