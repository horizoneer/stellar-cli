/**
 * Transaction broadcast command implementation
 * Reads signed XDR from file and submits to Horizon
 */

import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import Table from 'cli-table3';
import { Command } from 'commander';
import { broadcastTransaction, Network } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';
import { Transaction } from '../types';

export interface BroadcastOptions {
  network: Network;
  raw: boolean;
}

function formatBroadcastResult(tx: Transaction): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.green.bold('✅ Transaction Broadcast Successful!'));
  output.push(chalk.gray('─'.repeat(60)));
  output.push('');

  const table = new Table({
    head: [chalk.blue.bold('Field'), chalk.blue.bold('Value')],
    colWidths: [25, 60],
    style: { head: [], border: ['gray'] },
  });

  table.push(
    { [chalk.cyan('Hash')]: chalk.white(tx.hash) },
    { [chalk.cyan('Ledger')]: chalk.white(String(tx.ledger)) },
    { [chalk.cyan('Created At')]: chalk.white(tx.created_at) },
    { [chalk.cyan('Source Account')]: chalk.gray(truncateMiddle(tx.source_account, 50)) },
    { [chalk.cyan('Fee Paid')]: chalk.white(`${tx.fee_paid / 10000000} XLM`) },
    { [chalk.cyan('Operations')]: chalk.white(String(tx.operation_count)) },
    { [chalk.cyan('Status')]: tx.successful ? chalk.green('Success') : chalk.red('Failed') }
  );

  output.push(table.toString());
  output.push('');

  return output.join('\n');
}

function formatBroadcastError(data: any): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.red.bold('❌ Transaction Broadcast Failed'));
  output.push(chalk.gray('─'.repeat(60)));
  output.push('');

  if (data?.extras) {
    const table = new Table({
      head: [chalk.blue.bold('Field'), chalk.blue.bold('Value')],
      colWidths: [25, 60],
      style: { head: [], border: ['gray'] },
    });

    if (data.extras?.result_codes) {
      table.push(
        { [chalk.cyan('Transaction Result Code')]: chalk.white(data.extras.result_codes.transaction) },
        { [chalk.cyan('Operation Result Codes')]: chalk.white(data.extras.result_codes.operations.join(', ')) }
      );
    }

    if (data.extras?.envelope_xdr) {
      table.push({ [chalk.cyan('Envelope XDR')]: chalk.gray(truncateMiddle(data.extras.envelope_xdr, 50)) });
    }
    if (data.extras?.result_xdr) {
      table.push({ [chalk.cyan('Result XDR')]: chalk.gray(truncateMiddle(data.extras.result_xdr, 50)) });
    }

    output.push(table.toString());
  }

  output.push('');
  return output.join('\n');
}

function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const start = str.slice(0, Math.ceil(maxLength / 2));
  const end = str.slice(str.length - Math.floor(maxLength / 2));
  return start + '...' + end;
}

export async function broadcastCommand(
  xdrFilePath: string,
  options: BroadcastOptions
): Promise<void> {
  if (!xdrFilePath) {
    printError('XDR file path is required');
    process.exit(1);
  }

  const absolutePath = path.resolve(xdrFilePath);
  if (!fs.existsSync(absolutePath)) {
    printError(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use "mainnet" or "testnet".`);
    process.exit(1);
  }

  let xdr: string;
  try {
    xdr = fs.readFileSync(absolutePath, 'utf8').trim();
  } catch (err) {
    printError(`Failed to read file: ${(err as Error).message}`);
    process.exit(1);
  }

  if (!xdr) {
    printError('XDR file is empty');
    process.exit(1);
  }

  const spinner = ora({
    text: 'Broadcasting transaction...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const tx = await broadcastTransaction(xdr, options.network);
    spinner.succeed('Transaction broadcasted successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Transaction:'));
      console.log(JSON.stringify(tx, null, 2));
    } else {
      console.log(formatBroadcastResult(tx));
    }
  } catch (error) {
    spinner.fail('Failed to broadcast transaction');
    const { message, data } = handleError(error);
    printError(message);
    if (data) {
      console.log(formatBroadcastError(data));
    }
    process.exit(1);
  }
}

export function registerBroadcastCommand(program: Command): void {
  program
    .command('broadcast <xdr-file>')
    .description('Broadcast signed transaction XDR from file')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .action(async (xdrFilePath: string, options: BroadcastOptions) => {
      await broadcastCommand(xdrFilePath, options);
    });
}