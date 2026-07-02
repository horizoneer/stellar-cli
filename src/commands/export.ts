/**
 * Export command implementation
 * Exports data to JSON files
 */

import ora from 'ora';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import {
  fetchTransaction,
  fetchOperations,
  fetchLedger,
  fetchAccount,
  fetchAccountTransactions,
  fetchAccountPayments,
  Network,
  isAccountId,
  isTransactionHash
} from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';

export interface ExportOptions {
  network: Network;
  type: string;
  id: string;
  limit: number;
  output: string;
}

async function exportData(options: ExportOptions): Promise<any> {
  const { type, id, network, limit } = options;

  switch (type) {
    case 'transaction':
      if (!isTransactionHash(id)) {
        throw new Error('Invalid transaction hash');
      }
      const tx = await fetchTransaction(id, network);
      const ops = await fetchOperations(id, network);
      return {
        transaction: tx,
        operations: ops._embedded.records
      };

    case 'ledger':
      const ledgerSeq = parseInt(id, 10);
      if (isNaN(ledgerSeq)) {
        throw new Error('Invalid ledger sequence number');
      }
      return await fetchLedger(ledgerSeq, network);

    case 'account':
      if (!isAccountId(id)) {
        throw new Error('Invalid account ID');
      }
      return await fetchAccount(id, network);

    case 'transactions':
      if (!isAccountId(id)) {
        throw new Error('Invalid account ID');
      }
      const txs = await fetchAccountTransactions(id, network, limit);
      return txs._embedded.records;

    case 'payments':
      if (!isAccountId(id)) {
        throw new Error('Invalid account ID');
      }
      const payments = await fetchAccountPayments(id, network, limit);
      return payments._embedded.records;

    default:
      throw new Error('Unsupported export type: ' + type);
  }
}

export async function exportCommand(options: ExportOptions): Promise<void> {
  if (!options.type || !options.id) {
    printError('Both --type and --id are required');
    process.exit(1);
  }

  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError('Invalid network "' + options.network + '". Use "mainnet" or "testnet".');
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching data for export...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const data = await exportData(options);
    spinner.succeed('Data fetched successfully!');

    const outputPath = options.output || 'stellar_export_' + Date.now() + '.json';
    const absolutePath = path.resolve(outputPath);
    
    fs.writeFileSync(absolutePath, JSON.stringify(data, null, 2));
    
    console.log('');
    console.log(chalk.green('✓ Data exported successfully!'));
    console.log(chalk.cyan('Output file: ') + chalk.white(absolutePath));
    console.log('');
  } catch (error) {
    spinner.fail('Failed to export data');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description('Export data to JSON file')
    .option('-t, --type <type>', 'Type of data to export (transaction, ledger, account, transactions, payments)')
    .option('-i, --id <id>', 'ID or hash of the resource to export')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-l, --limit <limit>', 'Number of items for transactions/payments (default: 10)', '10')
    .option('-o, --output <file>', 'Output file path (default: stellar_export_<timestamp>.json)')
    .action(async (options: any) => {
      const limit = parseInt(options.limit, 10);
      await exportCommand({ ...options, limit });
    });
}
