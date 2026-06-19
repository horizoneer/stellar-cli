/**
 * Inspect command implementation
 * Fetches and displays Stellar transaction details
 */

import ora from 'ora';
import chalk from 'chalk';
import { Command } from 'commander';
import { fetchTransaction, fetchOperations, Network } from '../core/horizon';
import { decodeTransaction, decodeOperation } from '../core/decoder';
import { formatTransaction, printError } from '../core/formatter';
import { handleError } from '../utils/errors';

/**
 * Inspect command options
 */
export interface InspectOptions {
  network: Network;
  raw: boolean;
}

/**
 * Inspect command implementation
 * Fetches a transaction and displays formatted output
 * @param hashOrXdr - Transaction hash or XDR
 * @param options - Command options
 */
export async function inspectCommand(
  hashOrXdr: string,
  options: InspectOptions
): Promise<void> {
  // Validate network option
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use 'mainnet' or 'testnet'.`);
    process.exit(1);
  }

  // Create and start spinner
  const spinner = ora({
    text: 'Fetching transaction...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    // Fetch transaction
    const transaction = await fetchTransaction(hashOrXdr, options.network);
    spinner.text = 'Fetching operations...';

    // Fetch operations
    const operationsResponse = await fetchOperations(hashOrXdr, options.network);
    spinner.succeed('Transaction fetched successfully!');

    if (options.raw) {
      // Output raw JSON
      console.log('\n' + chalk.bold('Raw Transaction:'));
      console.log(JSON.stringify(transaction, null, 2));
      console.log('\n' + chalk.bold('Raw Operations:'));
      console.log(JSON.stringify(operationsResponse._embedded.records, null, 2));
    } else {
      // Decode and format
      const decodedTx = decodeTransaction(transaction);
      const decodedOps = operationsResponse._embedded.records.map(decodeOperation);

      // Display formatted output
      console.log(formatTransaction(decodedTx, decodedOps));
    }
  } catch (error) {
    spinner.fail('Failed to fetch transaction');
    const message = handleError(error);
    printError(message);
    process.exit(1);
  }
}

/**
 * Registers the inspect command with the CLI
 * @param program - Commander program instance
 */
export function registerInspectCommand(program: Command): void {
  program
    .command('inspect <hash-or-xdr>')
    .description('Inspect a Stellar transaction by hash or XDR')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .action(async (hashOrXdr: string, options: InspectOptions) => {
      await inspectCommand(hashOrXdr, options);
    });
}
