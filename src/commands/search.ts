/**
 * Search command implementation
 * Search for Stellar transactions by account or criteria
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { searchByAccount } from '../core/search';
import { Network } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';

/**
 * Search command options
 */
export interface SearchOptions {
  network: Network;
  limit: number;
}

/**
 * Truncate a string for display
 */
function truncate(str: string, maxLen: number): string {
  if (!str) return 'N/A';
  if (str.length <= maxLen) return str;
  return `${str.slice(0, Math.ceil(maxLen / 2))}...${str.slice(-Math.floor(maxLen / 2))}`;
}

/**
 * Search command implementation
 * Searches for transactions by account
 * @param accountId - Account ID to search for
 * @param options - Command options
 */
export async function searchCommand(
  accountId: string,
  options: SearchOptions
): Promise<void> {
  // Validate network option
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use 'mainnet' or 'testnet'.`);
    process.exit(1);
  }

  // Validate account ID format
  if (!accountId.startsWith('G') || accountId.length !== 56) {
    printError('Invalid account ID. Must be a valid Stellar public key (starts with G, 56 characters).');
    process.exit(1);
  }

  const spinner = ora({
    text: 'Searching for transactions...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const response = await searchByAccount(accountId, options.limit, options.network);
    const transactions = response._embedded.records;

    spinner.succeed(`Found ${transactions.length} transactions`);

    console.log('');
    console.log(chalk.blue.bold('🔍 Transaction Search Results'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');
    console.log(chalk.cyan(`Account: ${truncate(accountId, 30)}`));
    console.log(chalk.gray(`Network: ${options.network.toUpperCase()}`));
    console.log('');

    if (transactions.length === 0) {
      printInfo('No transactions found for this account');
      console.log('');
      return;
    }

    // Create results table
    const table = new Table({
      head: [
        chalk.blue.bold('#'),
        chalk.blue.bold('Hash'),
        chalk.blue.bold('Ops'),
        chalk.blue.bold('Fee'),
        chalk.blue.bold('Time'),
        chalk.blue.bold('Status'),
      ],
      colWidths: [5, 25, 6, 12, 22, 10],
      style: { head: [], border: ['gray'] },
    });

    transactions.forEach((tx, index) => {
      const fee = (tx.fee_paid / 10000).toFixed(4);
      const time = new Date(tx.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const txData = tx as typeof tx & { successful?: boolean };
      const status = txData.successful ? chalk.green('✓') : chalk.red('✗');

      table.push([
        chalk.gray((index + 1).toString()),
        chalk.cyan(truncate(tx.hash, 20)),
        chalk.white(tx.operation_count.toString()),
        chalk.gray(`${fee} XLM`),
        chalk.gray(time),
        status,
      ]);
    });

    console.log(table.toString());
    console.log('');

    printInfo(`Use 'stellar-inspector inspect <hash>' for transaction details`);
    console.log('');

  } catch (error) {
    spinner.fail('Search failed');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

/**
 * Registers the search command with the CLI
 * @param program - Commander program instance
 */
export function registerSearchCommand(program: Command): void {
  program
    .command('search <account-id>')
    .description('Search for transactions by account')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-l, --limit <number>', 'Maximum number of results', '10')
    .action(async (accountId: string, options: SearchOptions) => {
      options.limit = parseInt(String(options.limit), 10);
      await searchCommand(accountId, options);
    });
}
