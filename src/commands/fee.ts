/**
 * Fee command implementation
 * Displays fee statistics from Horizon
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchFeeStats, stroopsToXlm } from '../core/fees';
import { Network } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';

export interface FeeOptions {
  network: Network;
}

export async function feeCommand(options: FeeOptions): Promise<void> {
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use 'mainnet' or 'testnet'.`);
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching fee statistics...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const stats = await fetchFeeStats(options.network);
    spinner.succeed('Fee statistics retrieved!');

    console.log('');
    console.log(chalk.blue.bold('💸 Fee Estimator'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');

    const table = new Table({
      head: [chalk.blue.bold('Metric'), chalk.blue.bold('Stroops'), chalk.blue.bold('XLM')],
      colWidths: [20, 20, 20],
      style: { head: [], border: ['gray'] },
    });

    table.push(
      [chalk.cyan('Base Fee'), parseInt(stats.last_ledger_base_fee, 10).toLocaleString(), stroopsToXlm(parseInt(stats.last_ledger_base_fee, 10))],
      [chalk.cyan('Min Fee'), parseInt(stats.fee_charged.min, 10).toLocaleString(), stroopsToXlm(parseInt(stats.fee_charged.min, 10))],
      [chalk.cyan('Max Fee'), parseInt(stats.fee_charged.max, 10).toLocaleString(), stroopsToXlm(parseInt(stats.fee_charged.max, 10))],
      [chalk.cyan('p10'), parseInt(stats.fee_charged.p10, 10).toLocaleString(), stroopsToXlm(parseInt(stats.fee_charged.p10, 10))],
      [chalk.cyan('p50'), parseInt(stats.fee_charged.p50, 10).toLocaleString(), stroopsToXlm(parseInt(stats.fee_charged.p50, 10))],
      [chalk.cyan('p90'), parseInt(stats.fee_charged.p90, 10).toLocaleString(), stroopsToXlm(parseInt(stats.fee_charged.p90, 10))],
    );

    console.log(table.toString());
    console.log('');
  } catch (error) {
    spinner.fail('Failed to fetch fee statistics');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerFeeCommand(program: Command): void {
  program
    .command('fee')
    .description('Display fee statistics from Horizon')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .action(async (options: FeeOptions) => {
      await feeCommand(options);
    });
}
