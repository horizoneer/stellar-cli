/**
 * Inspect command implementation
 * Fetches and displays Stellar transaction details
 */

import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import axios from 'axios';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchTransaction, fetchOperations, Network, HORIZON_URLS } from '../core/horizon';
import { Transaction } from '../types';
import { decodeTransaction, decodeOperation, DecodedTransaction, DecodedOperation } from '../core/decoder';
import { formatTransaction, printError, printInfo } from '../core/formatter';
import { readConfig } from '../core/config';
import { handleError } from '../utils/errors';

/**
 * Inspect command options
 */
export interface InspectOptions {
  network: Network;
  raw: boolean;
  output?: string;
  memo?: string;
}

/**
 * Exports data as JSON to file
 */
function exportToJson(data: unknown, filePath: string): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Exports transactions as CSV to file
 */
function exportToCsv(transactions: Array<{ tx: Transaction; ops: DecodedOperation[] }>, filePath: string): void {
  const headers = ['Hash', 'Source Account', 'Created At', 'Fee', 'Operations', 'Status'];
  const rows = transactions.map(({ tx, ops }) => [
    tx.hash,
    tx.source_account,
    tx.created_at,
    tx.fee_paid / 10000000,
    ops.length,
    tx.successful ? 'success' : 'failed'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  fs.writeFileSync(filePath, csvContent);
}

/**
 * Displays multiple transactions in a single table
 */
function displayBatchTransactions(
  transactions: Array<{ hash: string; decodedTx: DecodedTransaction; decodedOps: DecodedOperation[] }>
): void {
  console.log('');
  console.log(chalk.blue.bold('📋 Batch Transaction Inspector'));
  console.log(chalk.gray('─'.repeat(70)));
  console.log('');

  const table = new Table({
    head: [
      chalk.blue.bold('#'),
      chalk.blue.bold('Hash'),
      chalk.blue.bold('Source'),
      chalk.blue.bold('Fee'),
      chalk.blue.bold('Ops'),
      chalk.blue.bold('Status'),
      chalk.blue.bold('Created'),
    ],
    colWidths: [5, 25, 25, 12, 5, 10, 20],
    style: { head: [], border: ['gray'] },
  });

  transactions.forEach(({ hash, decodedTx, decodedOps }, index) => {
    const statusDisplay = decodedTx.status === 'success'
      ? chalk.green('✓ Success')
      : chalk.yellow('✗ Failed');

    table.push([
      chalk.gray((index + 1).toString()),
      chalk.cyan(hash.slice(0, 20) + '...'),
      chalk.gray(decodedTx.sourceAccount.slice(0, 20) + '...'),
      chalk.white(decodedTx.fee),
      chalk.white(decodedOps.length.toString()),
      statusDisplay,
      chalk.gray(decodedTx.createdAt),
    ]);
  });

  console.log(table.toString());
  console.log('');
}

/**
 * Inspect command implementation
 * Fetches transactions and displays formatted output
 * @param hashOrXdrList - Transaction hashes or XDRs (batch)
 * @param options - Command options
 */
export async function inspectCommand(
  hashOrXdrList: string[],
  options: InspectOptions
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

  // Handle memo search
  if (options.memo) {
    await searchByMemo(options.memo, network);
    return;
  }

  // Create and start spinner
  const spinner = ora({
    text: `Fetching ${hashOrXdrList.length} transaction(s)...`,
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    // Fetch all transactions and operations
    const results: Array<{
      hash: string;
      tx: Transaction;
      opsResponse: { _embedded: { records: any[] } };
      decodedTx: DecodedTransaction;
      decodedOps: DecodedOperation[];
    }> = [];

    for (const hashOrXdr of hashOrXdrList) {
      spinner.text = `Fetching transaction ${hashOrXdr.slice(0, 20)}...`;
      const transaction = await fetchTransaction(hashOrXdr, network);
      const operationsResponse = await fetchOperations(hashOrXdr, network);
      const decodedTx = decodeTransaction(transaction);
      const decodedOps = operationsResponse._embedded.records.map(decodeOperation);

      results.push({
        hash: transaction.hash,
        tx: transaction,
        opsResponse: operationsResponse,
        decodedTx,
        decodedOps,
      });
    }

    spinner.succeed(`${hashOrXdrList.length} transaction(s) fetched successfully!`);

    // Handle output flag
    if (options.output) {
      const ext = options.output.split('.').pop()?.toLowerCase();
      const dataForExport = results.map(r => ({
        transaction: r.tx,
        operations: r.opsResponse._embedded.records
      }));

      if (ext === 'json') {
        exportToJson(dataForExport, options.output);
        printInfo(`Results exported to ${options.output} (JSON)`);
      } else if (ext === 'csv') {
        exportToCsv(results.map(r => ({ tx: r.tx, ops: r.decodedOps })), options.output);
        printInfo(`Results exported to ${options.output} (CSV)`);
      } else {
        printError(`Unsupported output format: ${ext}. Use .json or .csv.`);
        process.exit(1);
      }
    }

    // Handle raw or formatted output
    if (options.raw) {
      for (const result of results) {
        console.log('\n' + chalk.bold(`Raw Transaction: ${result.hash}`));
        console.log(JSON.stringify(result.tx, null, 2));
        console.log('\n' + chalk.bold('Raw Operations:'));
        console.log(JSON.stringify(result.opsResponse._embedded.records, null, 2));
      }
    } else {
      if (results.length === 1) {
        // Single transaction: full detailed view
        const result = results[0];
        console.log(formatTransaction(result.decodedTx, result.decodedOps));
      } else {
        // Multiple transactions: batch view
        displayBatchTransactions(results.map(r => ({
          hash: r.hash,
          decodedTx: r.decodedTx,
          decodedOps: r.decodedOps
        })));
      }
    }
  } catch (error) {
    spinner.fail('Failed to fetch transactions');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

/**
 * Search for transactions by memo
 * @param memoText - Memo text to search for
 * @param network - Network to query
 */
async function searchByMemo(memoText: string, network: Network): Promise<void> {
  const spinner = ora({
    text: 'Searching for transactions with matching memo...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    // First, we need to fetch transactions to search through
    // Since Horizon doesn't support memo search, we fetch recent transactions and filter locally
    const baseUrl = HORIZON_URLS[network];
    const url = `${baseUrl}/transactions?limit=200&order=desc`;
    const response = await axios.get(url, { timeout: 15000 });
    const transactions = response.data._embedded.records;

    // Find first transaction with matching memo
    const matchingTx = transactions.find((tx: Transaction) => 
      tx.memo && tx.memo.toLowerCase().includes(memoText.toLowerCase())
    );

    if (matchingTx) {
      spinner.succeed('Found matching transaction!');
      // Fetch full transaction details and operations
      const transaction = await fetchTransaction(matchingTx.hash, network);
      const operationsResponse = await fetchOperations(matchingTx.hash, network);
      const decodedTx = decodeTransaction(transaction);
      const decodedOps = operationsResponse._embedded.records.map(decodeOperation);
      console.log(formatTransaction(decodedTx, decodedOps));
    } else {
      spinner.fail('No matching transaction found');
      printInfo('Try fetching more transactions or using a different memo text');
    }
  } catch (error) {
    spinner.fail('Failed to search for memo');
    const { message } = handleError(error);
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
    .command('inspect [hash-or-xdr...]')
    .description('Inspect one or more Stellar transactions by hash or XDR, or search by memo')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .option('-o, --output <file>', 'Export results to file (JSON or CSV)', '')
    .option('-m, --memo <text>', 'Search for transactions by memo text')
    .action(async (hashOrXdrList: string[], options: InspectOptions) => {
      await inspectCommand(hashOrXdrList, options);
    });
}
