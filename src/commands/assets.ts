/**
 * Assets command implementation
 * View Stellar asset details and search for assets
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAssetDetails, searchAssetsByCode, formatAsset } from '../core/assets';
import { Network } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';

/**
 * Assets command options
 */
export interface AssetsOptions {
  network: Network;
  code?: string;
  issuer?: string;
}

/**
 * Truncate a string for display
 */
function truncate(str: string, maxLen: number): string {
  if (!str) return 'N/A';
  if (str.length <= maxLen) return str;
  return `${str.slice(0, Math.ceil(maxLen / 2))}...${str.slice(-Math.floor(maxLen / 2))}`;
}

/**
 * Assets command implementation
 * @param assetQuery - Asset code or "code:issuer"
 * @param options - Command options
 */
export async function assetsCommand(
  assetQuery: string | null,
  options: AssetsOptions
): Promise<void> {
  // Validate network option
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use 'mainnet' or 'testnet'.`);
    process.exit(1);
  }

  // Parse asset query if provided
  let assetCode = options.code;
  let assetIssuer = options.issuer;

  if (assetQuery) {
    const parts = assetQuery.split(':');
    if (parts.length === 2) {
      assetCode = parts[0];
      assetIssuer = parts[1];
    } else {
      assetCode = parts[0];
    }
  }

  const spinner = ora({
    text: 'Fetching asset information...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    if (assetCode && assetIssuer) {
      // Fetch specific asset details
      const asset = await fetchAssetDetails(assetCode, assetIssuer, options.network);
      spinner.succeed('Asset details retrieved!');

      console.log('');
      console.log(chalk.blue.bold('💰 Asset Details'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log('');

      const table = new Table({
        head: [chalk.blue.bold('Field'), chalk.blue.bold('Value')],
        colWidths: [20, 60],
        style: { head: [], border: ['gray'] },
      });

      const amount = parseFloat(asset.amount).toLocaleString('en-US', {
        maximumFractionDigits: 7,
      });

      table.push(
        { [chalk.cyan('Asset Code')]: chalk.white(asset.asset_code) },
        { [chalk.cyan('Issuer')]: chalk.gray(truncate(asset.asset_issuer, 40)) },
        { [chalk.cyan('Total Amount')]: chalk.white(`${amount} ${asset.asset_code}`) },
        { [chalk.cyan('Holders')]: chalk.white(asset.num_accounts.toLocaleString()) },
        { [chalk.cyan('Trustlines')]: chalk.gray(asset.accounts.authorized.toLocaleString()) }
      );

      console.log(table.toString());
      console.log('');

      // Show flags
      if (asset.flags.auth_required || asset.flags.auth_revocable || asset.flags.auth_immutable) {
        console.log(chalk.cyan.bold('Flags'));
        console.log(chalk.gray('─'.repeat(50)));
        if (asset.flags.auth_required) console.log(chalk.gray('  • Auth Required'));
        if (asset.flags.auth_revocable) console.log(chalk.gray('  • Auth Revocable'));
        if (asset.flags.auth_immutable) console.log(chalk.gray('  • Auth Immutable'));
        console.log('');
      }

    } else if (assetCode) {
      // Search for assets by code
      spinner.text = `Searching for assets with code "${assetCode}"...`;
      const response = await searchAssetsByCode(assetCode, options.network, 20);
      const assets = response._embedded.records;

      spinner.succeed(`Found ${assets.length} assets with code "${assetCode}"`);

      console.log('');
      console.log(chalk.blue.bold(`🔍 Asset Search Results: "${assetCode}"`));
      console.log(chalk.gray('─'.repeat(50)));
      console.log('');

      if (assets.length === 0) {
        printInfo('No assets found with this code');
        console.log('');
        return;
      }

      const table = new Table({
        head: [chalk.blue.bold('#'), chalk.blue.bold('Issuer'), chalk.blue.bold('Holders'), chalk.blue.bold('Amount')],
        colWidths: [5, 35, 12, 25],
        style: { head: [], border: ['gray'] },
      });

      assets.forEach((asset, index) => {
        const amount = parseFloat(asset.amount).toLocaleString('en-US', {
          maximumFractionDigits: 2,
        });
        table.push([
          chalk.gray((index + 1).toString()),
          chalk.cyan(truncate(asset.asset_issuer, 30)),
          chalk.white(asset.num_accounts.toLocaleString()),
          chalk.gray(amount),
        ]);
      });

      console.log(table.toString());
      console.log('');

    } else {
      spinner.fail('Please specify an asset code or "code:issuer"');
      console.log('');
      printInfo('Usage: stellar-inspector assets <code> --issuer <issuer>');
      printInfo('   or: stellar-inspector assets <code:issuer>');
      console.log('');
      process.exit(1);
    }

  } catch (error) {
    spinner.fail('Failed to fetch asset information');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

/**
 * Registers the assets command with the CLI
 * @param program - Commander program instance
 */
export function registerAssetsCommand(program: Command): void {
  program
    .command('assets [asset]')
    .description('View Stellar asset details or search for assets by code')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-c, --code <code>', 'Asset code to search for')
    .option('-i, --issuer <issuer>', 'Asset issuer account')
    .action(async (asset: string | null, options: AssetsOptions) => {
      await assetsCommand(asset, options);
    });
}
