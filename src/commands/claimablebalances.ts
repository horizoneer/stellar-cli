/**
 * Claimable Balances command implementation
 * Lists claimable balances (optionally for an account)
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchClaimableBalances, Network, isAccountId } from '../core/horizon';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';
import { ClaimableBalance } from '../types';

export interface ClaimableBalancesOptions {
  network: Network;
  raw: boolean;
  limit: number;
}

function formatPredicate(predicate: any): string {
  if (predicate.unconditional) {
    return 'Unconditional';
  }
  if (predicate.abs_before) {
    return `Before: ${new Date(predicate.abs_before).toLocaleString()}`;
  }
  if (predicate.rel_before) {
    return `Relative: ${predicate.rel_before} seconds`;
  }
  if (predicate.and) {
    return `(AND: ${predicate.and.map(formatPredicate).join(', ')})`;
  }
  if (predicate.or) {
    return `(OR: ${predicate.or.map(formatPredicate).join(', ')})`;
  }
  if (predicate.not) {
    return `(NOT: ${formatPredicate(predicate.not)})`;
  }
  return 'Complex';
}

function formatClaimableBalances(balances: ClaimableBalance[], accountId?: string): string {
  const output: string[] = [];

  output.push('');
  output.push(chalk.blue.bold('💰 Claimable Balances'));
  output.push(chalk.gray('─'.repeat(70)));
  output.push('');
  if (accountId) {
    output.push(chalk.cyan('Account: ') + chalk.white(accountId));
  }
  output.push('');

  if (balances.length === 0) {
    output.push(chalk.gray('No claimable balances found.'));
    output.push('');
    return output.join('\n');
  }

  const table = new Table({
    head: [
      chalk.blue.bold('ID'),
      chalk.blue.bold('Asset'),
      chalk.blue.bold('Amount'),
      chalk.blue.bold('Claimants'),
      chalk.blue.bold('Last Modified')
    ],
    colWidths: [15, 20, 12, 15, 18],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const cb of balances) {
    const claimantCount = cb.claimants.length;
    const claimantsText = `${claimantCount} claimant${claimantCount !== 1 ? 's' : ''}`;
    table.push([
      chalk.gray(truncateMiddle(cb.id, 13)),
      chalk.cyan(cb.asset),
      chalk.white(cb.amount),
      chalk.gray(claimantsText),
      chalk.white(cb.last_modified_time)
    ]);
  }

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

export async function claimableBalancesCommand(
  accountIdOrNothing: string,
  options: ClaimableBalancesOptions
): Promise<void> {
  let accountId: string | undefined;
  if (accountIdOrNothing) {
    if (isAccountId(accountIdOrNothing)) {
      accountId = accountIdOrNothing;
    } else {
      printError('Invalid Stellar account ID. Must start with G followed by 55 alphanumeric characters.');
      process.exit(1);
    }
  }

  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError('Invalid network "' + options.network + '". Use "mainnet" or "testnet".');
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching claimable balances...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const response = await fetchClaimableBalances(accountId, options.network, options.limit);
    spinner.succeed('Claimable balances fetched successfully!');

    if (options.raw) {
      console.log('\n' + chalk.bold('Raw Claimable Balances:'));
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log(formatClaimableBalances(response._embedded.records, accountId));
    }
  } catch (error) {
    spinner.fail('Failed to fetch claimable balances');
    const message = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerClaimableBalancesCommand(program: Command): void {
  program
    .command('claimablebalances [account-id]')
    .description('List claimable balances (optionally for an account)')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-r, --raw', 'Show raw JSON response instead of formatted output', false)
    .option('-l, --limit <limit>', 'Number of claimable balances to show (default: 10)', '10')
    .action(async (accountIdOrNothing: string, options: any) => {
      const limit = parseInt(options.limit, 10);
      await claimableBalancesCommand(accountIdOrNothing, { ...options, limit });
    });
}
