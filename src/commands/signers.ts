/**
 * Signers Command
 * Shows account's signers and thresholds (Security Audit)
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccount, Network, isAccountId } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';

export interface SignersOptions {
  network: Network;
  raw: boolean;
}

function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const start = str.slice(0, Math.ceil(maxLength / 2));
  const end = str.slice(str.length - Math.floor(maxLength / 2));
  return start + '...' + end;
}

function formatSigners(accountId: string, account: any): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('🔐 Account Signers & Thresholds (Security Audit)'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  output.push(chalk.cyan('Account: ') + chalk.white(truncateMiddle(accountId, 30)));
  output.push('');

  // Check master key
  const masterSigner = account.signers.find((s: any) => s.key === accountId);
  const masterKeyEnabled = masterSigner && masterSigner.weight > 0;
  
  output.push(chalk.cyan('Master Key Status: ') + (masterKeyEnabled ? chalk.green('Enabled') : chalk.red('Disabled')));
  output.push('');

  // Thresholds
  output.push(chalk.cyan('Thresholds:'));
  const thresholdTable = new Table({
    head: [
      chalk.blue.bold('Low'),
      chalk.blue.bold('Medium'),
      chalk.blue.bold('High')
    ],
    colWidths: [20, 20, 20],
    style: {
      head: [],
      border: ['gray'],
    },
  });
  thresholdTable.push([
    chalk.white(account.thresholds.low_threshold),
    chalk.white(account.thresholds.medium_threshold),
    chalk.white(account.thresholds.high_threshold)
  ]);
  output.push(thresholdTable.toString());
  output.push('');

  // Signers
  output.push(chalk.cyan('Signers:'));
  if (account.signers.length === 0) {
    output.push(chalk.gray('No signers found.'));
    output.push('');
    return output.join('\n');
  }

  const signersTable = new Table({
    head: [
      chalk.blue.bold('Signer Key'),
      chalk.blue.bold('Weight'),
      chalk.blue.bold('Type'),
      chalk.blue.bold('Is Master?')
    ],
    colWidths: [35, 10, 15, 10],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  account.signers.forEach((signer: any) => {
    const isMaster = signer.key === accountId;
    signersTable.push([
      chalk.white(truncateMiddle(signer.key, 33)),
      chalk.cyan(signer.weight),
      chalk.gray(signer.type),
      isMaster ? chalk.green('Yes') : chalk.gray('No')
    ]);
  });

  output.push(signersTable.toString());
  output.push('');

  // Security warnings
  if (account.signers.length === 1 && masterKeyEnabled) {
    output.push(chalk.yellow.bold('⚠ Security Warning: Only one signer (master key). Consider adding additional signers.'));
    output.push('');
  }

  return output.join('\n');
}

export async function signersCommand(
  accountId: string,
  options: SignersOptions
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
    text: 'Fetching signers...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const account = await fetchAccount(accountId, options.network);
    spinner.succeed('Signers fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Account Signers & Thresholds:'));
      console.log(JSON.stringify({
        thresholds: account.thresholds,
        signers: account.signers
      }, null, 2));
    } else {
      console.log(formatSigners(accountId, account));
    }
  } catch (error) {
    spinner.fail('Failed to fetch signers');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerSignersCommand(program: Command): void {
  program
    .command('signers <account-id>')
    .description('Show account\'s signers and thresholds (security audit)')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .action(async (accountId: string, options: SignersOptions) => {
      await signersCommand(accountId, options);
    });
}
