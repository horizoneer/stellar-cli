/**
 * Network status command implementation
 * Displays Horizon server health and network information
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchHorizonHealth, fetchNetworkMetrics, formatLedgerTime } from '../core/network';
import { Network } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';

/**
 * Network status command options
 */
export interface NetworkOptions {
  network: Network;
  metrics: boolean;
}

/**
 * Network status command implementation
 * Fetches and displays network health information
 * @param options - Command options
 */
export async function networkCommand(options: NetworkOptions): Promise<void> {
  // Validate network option
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use 'mainnet' or 'testnet'.`);
    process.exit(1);
  }

  // Create and start spinner
  const spinner = ora({
    text: 'Checking network status...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const health = await fetchHorizonHealth(options.network);
    spinner.succeed('Network status retrieved!');

    console.log('');
    console.log(chalk.blue.bold('🌐 Stellar Network Status'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');

    // Version info
    console.log(chalk.cyan.bold('📦 Versions'));
    console.log(chalk.gray('─'.repeat(50)));

    const versionTable = new Table({
      head: [chalk.blue.bold('Component'), chalk.blue.bold('Version')],
      colWidths: [25, 55],
      style: { head: [], border: ['gray'] },
    });

    versionTable.push(
      { [chalk.cyan('Horizon')]: chalk.white(health.horizon_version) },
      { [chalk.cyan('Stellar Core')]: chalk.white(health.core_version) },
      { [chalk.cyan('Protocol Version')]: chalk.white(health.current_protocol_version.toString()) }
    );

    console.log(versionTable.toString());
    console.log('');

    // Ledger info
    console.log(chalk.cyan.bold('📚 Ledger Information'));
    console.log(chalk.gray('─'.repeat(50)));

    const ledgerTable = new Table({
      head: [chalk.blue.bold('Metric'), chalk.blue.bold('Value')],
      colWidths: [25, 55],
      style: { head: [], border: ['gray'] },
    });

    const statusColor = health.core_latest_ledger === health.history_latest_ledger 
      ? chalk.green 
      : chalk.yellow;

    ledgerTable.push(
      { [chalk.cyan('Network')]: chalk.white(options.network.toUpperCase()) },
      { [chalk.cyan('Latest Ledger')]: statusColor(health.core_latest_ledger.toLocaleString()) },
      { [chalk.cyan('History Ledger')]: chalk.gray(health.history_latest_ledger.toLocaleString()) },
      { [chalk.cyan('Elder Ledger')]: chalk.gray(health.history_elder_ledger.toLocaleString()) },
      { [chalk.cyan('Last Close Time')]: chalk.gray(formatLedgerTime(health.core_latest_ledger_close_time)) }
    );

    console.log(ledgerTable.toString());
    console.log('');

    // Network passphrase
    console.log(chalk.cyan.bold('🔐 Network Passphrase'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray(health.network_passphrase));
    console.log('');

    // Sync status
    const isSynced = health.core_latest_ledger === health.history_latest_ledger;
    if (isSynced) {
      printInfo('✓ Horizon is synced with Stellar Core');
    } else {
      const diff = health.core_latest_ledger - health.history_latest_ledger;
      printInfo(`⚠ Horizon is ${diff} ledgers behind Stellar Core`);
    }
    console.log('');

    // Fetch metrics if requested
    if (options.metrics) {
      spinner.start('Fetching network metrics...');
      const metrics = await fetchNetworkMetrics(options.network);
      spinner.stop();

      if (metrics) {
        console.log(chalk.cyan.bold('📊 Network Metrics (24h)'));
        console.log(chalk.gray('─'.repeat(50)));

        const metricsTable = new Table({
          head: [chalk.blue.bold('Metric'), chalk.blue.bold('Value')],
          colWidths: [25, 55],
          style: { head: [], border: ['gray'] },
        });

        metricsTable.push(
          { [chalk.cyan('Accounts Created')]: chalk.white(metrics.accounts_created_24h.toLocaleString()) },
          { [chalk.cyan('Transactions')]: chalk.white(metrics.transactions_created_24h.toLocaleString()) },
          { [chalk.cyan('Operations')]: chalk.white(metrics.operations_created_24h.toLocaleString()) },
          { [chalk.cyan('Payments')]: chalk.white(metrics.payments_count_24h.toLocaleString()) },
          { [chalk.cyan('Ledgers Created')]: chalk.white(metrics.ledgers_created_24h.toLocaleString()) }
        );

        console.log(metricsTable.toString());
        console.log('');
      } else {
        printInfo('Metrics endpoint not available on this Horizon instance');
        console.log('');
      }
    }

  } catch (error) {
    spinner.fail('Failed to fetch network status');
    const message = handleError(error);
    printError(message);
    process.exit(1);
  }
}

/**
 * Registers the network command with the CLI
 * @param program - Commander program instance
 */
export function registerNetworkCommand(program: Command): void {
  program
    .command('network')
    .description('Check Stellar network status and Horizon health')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-m, --metrics', 'Show 24h network metrics', false)
    .action(async (options: NetworkOptions) => {
      await networkCommand(options);
    });
}
