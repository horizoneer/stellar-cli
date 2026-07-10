/**
 * Health Command
 * Displays network health status
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { Network, fetchHorizonInfo } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';

export interface HealthOptions {
  network: Network;
}

export async function healthCommand(options: HealthOptions): Promise<void> {
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError('Invalid network "' + options.network + '". Use "mainnet" or "testnet".');
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching network health...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const horizonInfo = await fetchHorizonInfo(options.network);
    spinner.succeed('Network health fetched successfully!');

    console.log('');
    console.log(chalk.blue.bold('🌐 Network Health Monitor'));
    console.log(chalk.gray('─'.repeat(70)));
    console.log('');

    // Determine status for latest ledgers
    const ledgerDiff = Math.abs(horizonInfo.core_latest_ledger - horizonInfo.history_latest_ledger);
    let syncStatus: string;
    let syncColor: typeof chalk.green | typeof chalk.yellow | typeof chalk.red;
    if (ledgerDiff === 0) {
      syncStatus = '✓ In Sync';
      syncColor = chalk.green;
    } else if (ledgerDiff <= 5) {
      syncStatus = '⚠ Slight Lag';
      syncColor = chalk.yellow;
    } else {
      syncStatus = '✗ Out of Sync';
      syncColor = chalk.red;
    }

    const healthTable = new Table({
      head: [chalk.blue.bold('Metric'), chalk.blue.bold('Value'), chalk.blue.bold('Status')],
      colWidths: [25, 35, 10],
      style: { head: [], border: ['gray'] },
    });

    healthTable.push(
      [chalk.cyan('Network Passphrase'), chalk.white(horizonInfo.network_passphrase), chalk.green('✓')],
      [chalk.cyan('Horizon Version'), chalk.white(horizonInfo.horizon_version), chalk.green('✓')],
      [chalk.cyan('Stellar Core Version'), chalk.white(horizonInfo.stellar_core_version), chalk.green('✓')],
      [chalk.cyan('Core Latest Ledger'), chalk.white(horizonInfo.core_latest_ledger.toString()), chalk.green('✓')],
      [chalk.cyan('History Latest Ledger'), chalk.white(horizonInfo.history_latest_ledger.toString()), chalk.green('✓')],
      [chalk.cyan('Sync Status'), chalk.white(horizonInfo.history_latest_ledger === horizonInfo.core_latest_ledger ? 'Yes' : `Lag: ${ledgerDiff} ledger(s)`), syncColor(syncStatus)],
      [chalk.cyan('Current Protocol Version'), chalk.white(horizonInfo.current_protocol_version.toString()), chalk.green('✓')],
      [chalk.cyan('Core Supported Protocol Version'), chalk.white(horizonInfo.core_supported_protocol_version.toString()), chalk.green('✓')]
    );

    console.log(healthTable.toString());
    console.log('');

  } catch (error) {
    spinner.fail('Failed to fetch network health');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerHealthCommand(program: Command): void {
  program
    .command('health')
    .description('Check network health and sync status')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .action(async (options: HealthOptions) => {
      await healthCommand(options);
    });
}
