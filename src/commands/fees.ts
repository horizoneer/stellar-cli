/**
 * Fees command implementation
 * Check current Stellar network fee statistics
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchFeeStats, stroopsToXlm, getRecommendedFee, getCongestionLevel } from '../core/fees';
import { Network } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';

/**
 * Fees command options
 */
export interface FeesOptions {
  network: Network;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Fees command implementation
 * Displays current network fee statistics
 * @param options - Command options
 */
export async function feesCommand(options: FeesOptions): Promise<void> {
  // Validate network option
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

    const congestion = getCongestionLevel(stats);
    const recommendedFee = getRecommendedFee(stats, options.priority);

    console.log('');
    console.log(chalk.blue.bold('💸 Network Fee Statistics'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');

    // Network info
    console.log(chalk.cyan.bold('📊 Network Status'));
    console.log(chalk.gray('─'.repeat(50)));

    const statusTable = new Table({
      head: [chalk.blue.bold('Metric'), chalk.blue.bold('Value')],
      colWidths: [25, 55],
      style: { head: [], border: ['gray'] },
    });

    const congestionDisplay = {
      low: chalk.green('Low'),
      medium: chalk.yellow('Medium'),
      high: chalk.red('High'),
    };

    statusTable.push(
      { [chalk.cyan('Network')]: chalk.white(options.network.toUpperCase()) },
      { [chalk.cyan('Latest Ledger')]: chalk.white(stats.last_ledger.toLocaleString()) },
      { [chalk.cyan('Base Fee')]: chalk.white(`${stroopsToXlm(stats.last_ledger_base_fee)} XLM`) },
      { [chalk.cyan('Capacity Usage')]: chalk.gray(`${(parseFloat(stats.ledger_capacity_usage) * 100).toFixed(1)}%`) },
      { [chalk.cyan('Congestion')]: congestionDisplay[congestion] }
    );

    console.log(statusTable.toString());
    console.log('');

    // Fee charged distribution
    console.log(chalk.cyan.bold('💰 Fee Distribution (Actual Fees Paid)'));
    console.log(chalk.gray('─'.repeat(50)));

    const feeTable = new Table({
      head: [chalk.blue.bold('Percentile'), chalk.blue.bold('Fee (stroops)'), chalk.blue.bold('Fee (XLM)')],
      colWidths: [20, 25, 25],
      style: { head: [], border: ['gray'] },
    });

    const percentiles = ['min', 'p10', 'p50', 'p90', 'p95', 'max'] as const;

    percentiles.forEach((p) => {
      const value = stats.fee_charged[p as keyof typeof stats.fee_charged];
      const highlight = (p === 'p50' || p === 'min' || p === 'max');
      feeTable.push({
        [chalk.cyan(p.toUpperCase())]: highlight ? chalk.white(value.toLocaleString()) : chalk.gray(value.toLocaleString()),
        '': highlight ? chalk.white(stroopsToXlm(value)) : chalk.gray(stroopsToXlm(value)),
      });
    });

    console.log(feeTable.toString());
    console.log('');

    // Recommendation
    console.log(chalk.green.bold('✓ Recommended Fee'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');
    console.log(chalk.white(`  Priority: ${options.priority.toUpperCase()}`));
    console.log(chalk.white(`  Fee: ${recommendedFee.toLocaleString()} stroops (${stroopsToXlm(recommendedFee)} XLM)`));
    console.log('');

    // Fee estimation tips
    console.log(chalk.cyan.bold('💡 Fee Tips'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');

    if (congestion === 'high') {
      console.log(chalk.yellow('  ⚠ Network is congested. Consider using a higher fee for faster inclusion.'));
    } else if (congestion === 'medium') {
      console.log(chalk.gray('  • Network has moderate traffic. Standard fees should work fine.'));
    } else {
      console.log(chalk.gray('  • Network is uncongested. Minimum fee should be sufficient.'));
    }

    console.log('');
    console.log(chalk.gray(`  Base fee is the minimum required: ${stroopsToXlm(stats.last_ledger_base_fee)} XLM`));
    console.log(chalk.gray(`  Use higher fees during peak hours for faster transactions`));
    console.log('');

  } catch (error) {
    spinner.fail('Failed to fetch fee statistics');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

/**
 * Registers the fees command with the CLI
 * @param program - Commander program instance
 */
export function registerFeesCommand(program: Command): void {
  program
    .command('fees')
    .description('Check current Stellar network fee statistics')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-p, --priority <level>', 'Fee priority (low, medium, high)', 'medium')
    .action(async (options: FeesOptions) => {
      await feesCommand(options);
    });
}
