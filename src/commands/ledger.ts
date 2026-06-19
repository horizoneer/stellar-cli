/**
 * Ledger command implementation
 * Inspects a specific Stellar ledger by sequence number
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchLedger, Network } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';
import { Ledger } from '../types';

export interface LedgerOptions {
  network: Network;
  raw: boolean;
}

function formatLedger(ledger: Ledger): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('📊 Stellar Ledger Inspector'));
  output.push(chalk.gray('─'.repeat(50)));
  output.push('');

  const table = new Table({
    head: [chalk.blue.bold('Field'), chalk.blue.bold('Value')],
    colWidths: [20, 60],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  const baseFee = (ledger.base_fee_in_stroops / 10000000).toFixed(7);
  const baseReserve = (ledger.base_reserve_in_stroops / 10000000).toFixed(7);
  const totalCoins = (Number(ledger.total_coins) / 10000000).toFixed(7);
  const feePool = (Number(ledger.fee_pool) / 10000000).toFixed(7);

  table.push(
    { [chalk.cyan('Sequence')]: chalk.white(String(ledger.sequence)) },
    { [chalk.cyan('Hash')]: chalk.gray(truncateMiddle(ledger.hash, 25)) },
    { [chalk.cyan('Closed At')]: chalk.gray(ledger.closed_at) },
    { [chalk.cyan('Transactions')]: chalk.white(String(ledger.transaction_count)) },
    { [chalk.cyan('Operations')]: chalk.white(String(ledger.operation_count)) },
    { [chalk.cyan('Base Fee')]: chalk.white(baseFee + ' XLM') },
    { [chalk.cyan('Base Reserve')]: chalk.white(baseReserve + ' XLM') },
    { [chalk.cyan('Total Coins')]: chalk.white(totalCoins + ' XLM') },
    { [chalk.cyan('Fee Pool')]: chalk.white(feePool + ' XLM') },
    { [chalk.cyan('Protocol Version')]: chalk.white(String(ledger.protocol_version)) }
  );

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

export async function ledgerCommand(
  sequence: string,
  options: LedgerOptions
): Promise<void> {
  const seqNum = parseInt(sequence, 10);
  if (isNaN(seqNum)) {
    printError('Invalid ledger sequence number. Must be a positive integer.');
    process.exit(1);
  }

  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError('Invalid network "' + options.network + '". Use "mainnet" or "testnet".');
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching ledger...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const ledger = await fetchLedger(seqNum, options.network);
    spinner.succeed('Ledger fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Ledger:'));
      console.log(JSON.stringify(ledger, null, 2));
    } else {
      console.log(formatLedger(ledger));
    }
  } catch (error) {
    spinner.fail('Failed to fetch ledger');
    const message = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerLedgerCommand(program: Command): void {
  program
    .command('ledger <sequence>')
    .description('Inspect a Stellar ledger by sequence number')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .action(async (sequence: string, options: LedgerOptions) => {
      await ledgerCommand(sequence, options);
    });
}
