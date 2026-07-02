/**
 * Operations Command
 * Lists recent operations for an account
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccountOperations, Network, isAccountId } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';
import { Operation } from '../types';

export interface OperationsOptions {
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

function formatOperations(accountId: string, operations: Operation[]): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('⚙️ Recent Operations'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  output.push(chalk.cyan('Account: ') + chalk.white(truncateMiddle(accountId, 30)));
  output.push('');

  if (operations.length === 0) {
    output.push(chalk.gray('No operations found.'));
    output.push('');
    return output.join('\n');
  }

  const table = new Table({
    head: [
      chalk.blue.bold('Type'),
      chalk.blue.bold('Created At'),
      chalk.blue.bold('Successful')
    ],
    colWidths: [25, 30, 15],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  operations.forEach((op) => {
    table.push([
      chalk.cyan(op.type),
      chalk.white(op.created_at),
      op.transaction_successful ? chalk.green('Yes') : chalk.red('No')
    ]);
  });

  output.push(table.toString());
  output.push('');

  return output.join('\n');
}

export async function operationsCommand(
  accountId: string,
  options: OperationsOptions
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
    text: 'Fetching operations...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const response = await fetchAccountOperations(accountId, options.network, options.limit);
    spinner.succeed('Operations fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Operations:'));
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log(formatOperations(accountId, response._embedded.records));
    }
  } catch (error) {
    spinner.fail('Failed to fetch operations');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerOperationsCommand(program: Command): void {
  program
    .command('operations <account-id>')
    .description('List recent operations for an account')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .option('-l, --limit <limit>', 'Number of operations to show (default: 10)', '10')
    .action(async (accountId: string, options: any) => {
      const limit = parseInt(options.limit, 10);
      await operationsCommand(accountId, { ...options, limit });
    });
}
