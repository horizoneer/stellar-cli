/**
 * Asset lookup command implementation
 * Fetches and displays asset metadata from Horizon
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAsset, fetchAccount, Network, isAccountId } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';
import { AssetDetails, Account } from '../types';

export interface AssetOptions {
  network: Network;
  raw: boolean;
}

function formatAsset(asset: AssetDetails, issuer: Account): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('💰 Asset Lookup'));
  output.push(chalk.gray('─'.repeat(60)));
  output.push('');
  output.push(chalk.cyan.bold('Asset Info'));
  output.push(chalk.gray('─'.repeat(30)));

  const assetTable = new Table({
    head: [chalk.blue.bold('Field'), chalk.blue.bold('Value')],
    colWidths: [25, 60],
    style: { head: [], border: ['gray'] },
  });

  assetTable.push(
    { [chalk.cyan('Code')]: chalk.white(asset.asset_code) },
    { [chalk.cyan('Issuer')]: chalk.gray(truncateMiddle(asset.asset_issuer, 50)) },
    { [chalk.cyan('Type')]: chalk.white(asset.asset_type) },
    { [chalk.cyan('Total Supply')]: chalk.white(asset.amount) },
    { [chalk.cyan('Trustlines')]: chalk.white(String(asset.num_accounts)) },
    { [chalk.cyan('Claimable Balances')]: chalk.white(String(asset.num_claimable_balances)) },
    { [chalk.cyan('Liquidity Pools')]: chalk.white(String(asset.num_liquidity_pools)) },
    { [chalk.cyan('Contracts')]: chalk.white(String(asset.num_contracts)) }
  );

  output.push(assetTable.toString());
  output.push('');

  // Flags
  output.push(chalk.cyan.bold('Flags'));
  output.push(chalk.gray('─'.repeat(30)));
  const flagsTable = new Table({
    head: [chalk.blue.bold('Flag'), chalk.blue.bold('Enabled')],
    colWidths: [25, 20],
    style: { head: [], border: ['gray'] },
  });

  flagsTable.push(
    [chalk.gray('Auth Required'), asset.flags.auth_required ? chalk.green('Yes') : chalk.red('No')],
    [chalk.gray('Auth Revocable'), asset.flags.auth_revocable ? chalk.green('Yes') : chalk.red('No')],
    [chalk.gray('Auth Immutable'), asset.flags.auth_immutable ? chalk.green('Yes') : chalk.red('No')],
    [chalk.gray('Auth Clawback'), asset.flags.auth_clawback_enabled ? chalk.green('Yes') : chalk.red('No')]
  );

  output.push(flagsTable.toString());
  output.push('');

  // Issuer Account Info
  output.push(chalk.cyan.bold('Issuer Account'));
  output.push(chalk.gray('─'.repeat(30)));
  const issuerTable = new Table({
    head: [chalk.blue.bold('Field'), chalk.blue.bold('Value')],
    colWidths: [25, 60],
    style: { head: [], border: ['gray'] },
  });

  issuerTable.push(
    { [chalk.cyan('ID')]: chalk.gray(truncateMiddle(issuer.id, 50)) },
    { [chalk.cyan('Sequence')]: chalk.white(String(issuer.sequence)) },
    { [chalk.cyan('Subentries')]: chalk.white(String(issuer.subentry_count)) },
    { [chalk.cyan('Home Domain')]: issuer.home_domain ? chalk.white(issuer.home_domain) : chalk.gray('None') }
  );

  output.push(issuerTable.toString());
  output.push('');

  return output.join('\n');
}

function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const start = str.slice(0, Math.ceil(maxLength / 2));
  const end = str.slice(str.length - Math.floor(maxLength / 2));
  return start + '...' + end;
}

export async function assetCommand(
  code: string,
  issuer: string,
  options: AssetOptions
): Promise<void> {
  if (!code) {
    printError('Asset code is required');
    process.exit(1);
  }
  if (!isAccountId(issuer)) {
    printError('Invalid issuer account ID. Must be a valid Stellar public key (starts with G, 56 characters).');
    process.exit(1);
  }

  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use "mainnet" or "testnet".`);
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching asset details...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const asset = await fetchAsset(code, issuer, options.network);
    const issuerAccount = await fetchAccount(issuer, options.network);
    spinner.succeed('Asset details fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Asset:'));
      console.log(JSON.stringify(asset, null, 2));
      console.log('\n' + chalk.bold('Raw Issuer Account:'));
      console.log(JSON.stringify(issuerAccount, null, 2));
    } else {
      console.log(formatAsset(asset, issuerAccount));
    }
  } catch (error) {
    spinner.fail('Failed to fetch asset details');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerAssetCommand(program: Command): void {
  program
    .command('asset <code> <issuer>')
    .description('Lookup asset metadata by code and issuer')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .action(async (code: string, issuer: string, options: AssetOptions) => {
      await assetCommand(code, issuer, options);
    });
}