/**
 * Server Info command implementation
 * Shows Horizon server details
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchHorizonInfo, Network } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';

export interface ServerInfoOptions {
  network: Network;
  raw: boolean;
}

function formatServerInfo(info: any, network: Network): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('🌐 Horizon Server Info'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  output.push(chalk.cyan('Network: ') + chalk.white(network.toUpperCase()));
  output.push('');

  const table = new Table({
    head: [
      chalk.blue.bold('Field'),
      chalk.blue.bold('Value')
    ],
    colWidths: [35, 55],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  table.push(
    { [chalk.cyan('Horizon Version')]: chalk.white(info.horizon_version) },
    { [chalk.cyan('Stellar Core Version')]: chalk.white(info.stellar_core_version) },
    { [chalk.cyan('Network Passphrase')]: chalk.gray(truncateMiddle(info.network_passphrase, 53)) },
    { [chalk.cyan('Current Protocol Version')]: chalk.white(info.current_protocol_version) },
    { [chalk.cyan('Core Supported Protocol Version')]: chalk.white(info.core_supported_protocol_version) },
    { [chalk.cyan('Ingest Latest Ledger')]: chalk.white(info.ingest_latest_ledger) },
    { [chalk.cyan('Ingest Latest Ledger Close Time')]: chalk.gray(info.ingest_latest_ledger_close_time) },
    { [chalk.cyan('History Latest Ledger')]: chalk.white(info.history_latest_ledger) },
    { [chalk.cyan('History Latest Ledger Close Time')]: chalk.gray(info.history_latest_ledger_close_time) },
    { [chalk.cyan('History Elder Ledger')]: chalk.white(info.history_elder_ledger) },
    { [chalk.cyan('History Elder Ledger Close Time')]: chalk.gray(info.history_elder_ledger_close_time) },
    { [chalk.cyan('Core Latest Ledger')]: chalk.white(info.core_latest_ledger) }
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

export async function serverInfoCommand(
  options: ServerInfoOptions
): Promise<void> {
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError('Invalid network "' + options.network + '". Use "mainnet" or "testnet".');
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching server info...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const info = await fetchHorizonInfo(options.network);
    spinner.succeed('Server info fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Server Info:'));
      console.log(JSON.stringify(info, null, 2));
    } else {
      console.log(formatServerInfo(info, options.network));
    }
  } catch (error) {
    spinner.fail('Failed to fetch server info');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerServerInfoCommand(program: Command): void {
  program
    .command('serverinfo')
    .description('Show Horizon server details')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .action(async (options: ServerInfoOptions) => {
      await serverInfoCommand(options);
    });
}
