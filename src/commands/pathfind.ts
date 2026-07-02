/**
 * Pathfind command implementation
 * Finds payment paths between assets
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchPathfind, Network, isAccountId } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';

export interface PathfindOptions {
  network: Network;
  raw: boolean;
  destinationAsset: string;
}

function formatAsset(asset: any): string {
  if (asset.asset_type === 'native') {
    return 'XLM';
  }
  return `${asset.asset_code}:${truncateMiddle(asset.asset_issuer, 10)}`;
}

function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const start = str.slice(0, Math.ceil(maxLength / 2));
  const end = str.slice(str.length - Math.floor(maxLength / 2));
  return start + '...' + end;
}

function formatPathfindResponse(response: any): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('🛤️ Payment Paths'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  output.push(chalk.cyan('Source Account: ') + chalk.white(truncateMiddle(response.source_account, 30)));
  output.push(chalk.cyan('Destination Account: ') + chalk.white(truncateMiddle(response.destination_account, 30)));
  output.push('');

  if (response.records.length === 0) {
    output.push(chalk.gray('No payment paths found.'));
    output.push('');
    return output.join('\n');
  }

  const table = new Table({
    head: [
      chalk.blue.bold('#'),
      chalk.blue.bold('Source Amount'),
      chalk.blue.bold('Source Asset'),
      chalk.blue.bold('Destination Amount'),
      chalk.blue.bold('Destination Asset'),
      chalk.blue.bold('Path Length')
    ],
    colWidths: [5, 15, 20, 18, 20, 12],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  response.records.forEach((path: any, index: number) => {
    const sourceAssetStr = formatAsset({
      asset_type: path.source_asset_type,
      asset_code: path.source_asset_code,
      asset_issuer: path.source_asset_issuer
    });
    const destAssetStr = formatAsset({
      asset_type: path.destination_asset_type,
      asset_code: path.destination_asset_code,
      asset_issuer: path.destination_asset_issuer
    });

    table.push([
      chalk.gray(index + 1),
      chalk.cyan(path.source_amount),
      chalk.white(sourceAssetStr),
      chalk.cyan(path.destination_amount),
      chalk.white(destAssetStr),
      chalk.gray(path.path.length)
    ]);
  });

  output.push(table.toString());
  output.push('');

  return output.join('\n');
}

export async function pathfindCommand(
  sourceAccount: string,
  destinationAccount: string,
  destinationAmount: string,
  options: PathfindOptions
): Promise<void> {
  if (!isAccountId(sourceAccount)) {
    printError('Invalid source account ID. Must start with G followed by 55 alphanumeric characters.');
    process.exit(1);
  }
  if (!isAccountId(destinationAccount)) {
    printError('Invalid destination account ID. Must start with G followed by 55 alphanumeric characters.');
    process.exit(1);
  }
  if (isNaN(parseFloat(destinationAmount))) {
    printError('Invalid destination amount. Must be a number.');
    process.exit(1);
  }

  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError('Invalid network "' + options.network + '". Use "mainnet" or "testnet".');
    process.exit(1);
  }

  const spinner = ora({
    text: 'Finding payment paths...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const response = await fetchPathfind(
      sourceAccount,
      destinationAccount,
      destinationAmount,
      options.destinationAsset,
      options.network
    );
    spinner.succeed('Payment paths found!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Pathfind Response:'));
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log(formatPathfindResponse(response));
    }
  } catch (error) {
    spinner.fail('Failed to find payment paths');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerPathfindCommand(program: Command): void {
  program
    .command('pathfind <source-account> <destination-account> <destination-amount>')
    .description('Find payment paths')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .option('-a, --destination-asset <asset>', 'Destination asset (CODE:ISSUER or native)', 'native')
    .action(async (sourceAccount: string, destinationAccount: string, destinationAmount: string, options: any) => {
      await pathfindCommand(sourceAccount, destinationAccount, destinationAmount, { ...options, destinationAsset: options.destinationAsset });
    });
}
