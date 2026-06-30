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
      [chalk.cyan('Base Fee'), stats.last_ledger_base_fee.toLocaleString(), stroopsToXlm(stats.last_ledger_base_fee)],
      [chalk.cyan('Min Fee'), stats.fee_charged.min.toLocaleString(), stroopsToXlm(stats.fee_charged.min)],
      [chalk.cyan('Max Fee'), stats.fee_charged.max.toLocaleString(), stroopsToXlm(stats.fee_charged.max)],
      [chalk.cyan('p10'), stats.fee_charged.p10.toLocaleString(), stroopsToXlm(stats.fee_charged.p10)],
      [chalk.cyan('p50'), stats.fee_charged.p50.toLocaleString(), stroopsToXlm(stats.fee_charged.p50)],
      [chalk.cyan('p90'), stats.fee_charged.p90.toLocaleString(), stroopsToXlm(stats.fee_charged.p90)],
    );

    console.log(table.toString());
    console.log('');
  } catch (error) {
    spinner.fail('Failed to fetch fee statistics');
    const message = handleError(error);
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
