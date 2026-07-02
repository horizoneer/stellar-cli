/**
 * Transaction diff command implementation
 * Compares two transactions side-by-side
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchTransaction, fetchOperations, Network, isTransactionHash } from '../core/horizon';
import { Transaction, Operation } from '../types';
import { decodeTransaction, decodeOperation, DecodedTransaction, DecodedOperation } from '../core/decoder';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';

export interface DiffOptions {
  network: Network;
  raw: boolean;
}

function formatDiff(tx1: DecodedTransaction, ops1: DecodedOperation[], tx2: DecodedTransaction, ops2: DecodedOperation[]): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('🔍 Transaction Diff'));
  output.push(chalk.gray('─'.repeat(80)));
  output.push('');

  // Summary Table
  const summaryTable = new Table({
    head: [
      chalk.blue.bold('Field'),
      chalk.blue.bold('Transaction 1'),
      chalk.blue.bold('Transaction 2')
    ],
    colWidths: [25, 35, 35],
    style: { head: [], border: ['gray'] },
  });

  summaryTable.push(
    [
      chalk.cyan('Hash'),
      chalk.gray(truncateMiddle(tx1.hash, 30)),
      chalk.gray(truncateMiddle(tx2.hash, 30))
    ],
    [
      chalk.cyan('Source Account'),
      chalk.gray(truncateMiddle(tx1.sourceAccount, 30)),
      chalk.gray(truncateMiddle(tx2.sourceAccount, 30))
    ],
    [
      chalk.cyan('Fee'),
      formatValue(tx1.fee, tx2.fee),
      formatValue(tx2.fee, tx1.fee)
    ],
    [
      chalk.cyan('Memo'),
      formatValue(tx1.memo || 'None', tx2.memo || 'None'),
      formatValue(tx2.memo || 'None', tx1.memo || 'None')
    ],
    [
      chalk.cyan('Operations'),
      formatValue(String(ops1.length), String(ops2.length)),
      formatValue(String(ops2.length), String(ops1.length))
    ],
    [
      chalk.cyan('Status'),
      formatValue(tx1.status, tx2.status),
      formatValue(tx2.status, tx1.status)
    ]
  );

  output.push(summaryTable.toString());
  output.push('');

  // Operations Diff
  if (ops1.length > 0 || ops2.length > 0) {
    output.push(chalk.cyan.bold('Operations'));
    output.push(chalk.gray('─'.repeat(80)));

    const maxOps = Math.max(ops1.length, ops2.length);
    for (let i = 0; i < maxOps; i++) {
      const op1 = ops1[i];
      const op2 = ops2[i];

      output.push('');
      output.push(chalk.gray.bold(`Operation ${i + 1}`));
      const opTable = new Table({
        head: [
          chalk.blue.bold('Field'),
          chalk.blue.bold('Transaction 1'),
          chalk.blue.bold('Transaction 2')
        ],
        colWidths: [25, 35, 35],
        style: { head: [], border: ['gray'] },
      });

      if (op1 && op2) {
        opTable.push(
          [
            chalk.cyan('Type'),
            formatValue(op1.type, op2.type),
            formatValue(op2.type, op1.type)
          ]
        );
      } else if (op1) {
        opTable.push(
          [chalk.cyan('Type'), chalk.red(op1.type), chalk.gray('N/A')],
          [chalk.cyan('Status'), chalk.red('Only in Transaction 1'), chalk.gray('N/A')]
        );
      } else if (op2) {
        opTable.push(
          [chalk.cyan('Type'), chalk.gray('N/A'), chalk.green(op2.type)],
          [chalk.cyan('Status'), chalk.gray('N/A'), chalk.green('Only in Transaction 2')]
        );
      }

      output.push(opTable.toString());
    }
  }

  output.push('');
  return output.join('\n');
}

function formatValue(value: string, other: string): string {
  if (value === other) {
    return chalk.gray(value);
  }
  return chalk.yellow(value);
}

function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const start = str.slice(0, Math.ceil(maxLength / 2));
  const end = str.slice(str.length - Math.floor(maxLength / 2));
  return start + '...' + end;
}

export async function diffCommand(
  hash1: string,
  hash2: string,
  options: DiffOptions
): Promise<void> {
  if (!isTransactionHash(hash1) && !hash1) {
    printError('First transaction hash or XDR is invalid');
    process.exit(1);
  }
  if (!isTransactionHash(hash2) && !hash2) {
    printError('Second transaction hash or XDR is invalid');
    process.exit(1);
  }

  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use "mainnet" or "testnet".`);
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching transactions...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    // Fetch both transactions and their operations
    const [
      tx1,
      opsResponse1,
      tx2,
      opsResponse2
    ] = await Promise.all([
      fetchTransaction(hash1, options.network),
      fetchOperations(hash1, options.network),
      fetchTransaction(hash2, options.network),
      fetchOperations(hash2, options.network)
    ]);

    const decodedTx1 = decodeTransaction(tx1);
    const decodedOps1 = opsResponse1._embedded.records.map(decodeOperation);
    const decodedTx2 = decodeTransaction(tx2);
    const decodedOps2 = opsResponse2._embedded.records.map(decodeOperation);

    spinner.succeed('Transactions fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Transaction 1:'));
      console.log(JSON.stringify(tx1, null, 2));
      console.log('\n' + chalk.bold('Transaction 2:'));
      console.log(JSON.stringify(tx2, null, 2));
    } else {
      console.log(formatDiff(decodedTx1, decodedOps1, decodedTx2, decodedOps2));
    }
  } catch (error) {
    spinner.fail('Failed to fetch transactions');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerDiffCommand(program: Command): void {
  program
    .command('diff <hash1> <hash2>')
    .description('Compare two transactions side-by-side')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .action(async (hash1: string, hash2: string, options: DiffOptions) => {
      await diffCommand(hash1, hash2, options);
    });
}