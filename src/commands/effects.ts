/**
 * Effects command implementation
 * View effects of a transaction or account
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchTransactionEffects, fetchAccountEffects, decodeEffect } from '../core/effects';
import { Network } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';

/**
 * Effects command options
 */
export interface EffectsOptions {
  network: Network;
  account?: string;
  limit: number;
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
 * Effects command implementation
 * @param query - Transaction hash or account ID
 * @param options - Command options
 */
export async function effectsCommand(
  query: string,
  options: EffectsOptions
): Promise<void> {
  // Validate network option
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use 'mainnet' or 'testnet'.`);
    process.exit(1);
  }

  // Determine if query is a transaction hash or account ID
  const isTransactionHash = /^[a-f0-9]{64}$/i.test(query);
  const isAccountId = query.startsWith('G') && query.length === 56;

  if (!isTransactionHash && !isAccountId) {
    printError('Invalid query. Provide a transaction hash (64 hex chars) or account ID (starts with G).');
    process.exit(1);
  }

  const spinner = ora({
    text: isTransactionHash ? 'Fetching transaction effects...' : 'Fetching account effects...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    let effects;
    let contextType: string;

    if (isTransactionHash) {
      const response = await fetchTransactionEffects(query, options.network);
      effects = response._embedded.records.map(decodeEffect);
      contextType = 'transaction';
      spinner.succeed(`Found ${effects.length} effects`);
    } else {
      const response = await fetchAccountEffects(query, options.limit, options.network);
      effects = response._embedded.records.map(decodeEffect);
      contextType = 'account';
      spinner.succeed(`Found ${effects.length} recent effects`);
    }

    console.log('');
    console.log(chalk.blue.bold('⚡ Effects'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');

    if (contextType === 'transaction') {
      console.log(chalk.cyan(`Transaction: ${truncate(query, 30)}`));
    } else {
      console.log(chalk.cyan(`Account: ${truncate(query, 30)}`));
    }
    console.log(chalk.gray(`Network: ${options.network.toUpperCase()}`));
    console.log('');

    if (effects.length === 0) {
      printInfo('No effects found');
      console.log('');
      return;
    }

    // Group effects by type
    const groupedEffects: Record<string, typeof effects> = {};
    effects.forEach((effect) => {
      if (!groupedEffects[effect.type]) {
        groupedEffects[effect.type] = [];
      }
      groupedEffects[effect.type].push(effect);
    });

    // Display summary
    console.log(chalk.cyan.bold('📋 Effect Summary'));
    console.log(chalk.gray('─'.repeat(50)));

    const summaryTable = new Table({
      head: [chalk.blue.bold('Type'), chalk.blue.bold('Count')],
      colWidths: [35, 15],
      style: { head: [], border: ['gray'] },
    });

    Object.entries(groupedEffects).forEach(([type, items]) => {
      summaryTable.push([
        chalk.cyan(type.replace(/_/g, ' ')),
        chalk.white(items.length.toString()),
      ]);
    });

    console.log(summaryTable.toString());
    console.log('');

    // Display detailed effects
    console.log(chalk.cyan.bold('📝 Detailed Effects'));
    console.log(chalk.gray('─'.repeat(50)));

    const table = new Table({
      head: [
        chalk.blue.bold('Type'),
        chalk.blue.bold('Account'),
        chalk.blue.bold('Description'),
        chalk.blue.bold('Time'),
      ],
      colWidths: [25, 20, 30, 12],
      style: { head: [], border: ['gray'] },
    });

    effects.forEach((effect) => {
      const type = effect.type.replace(/_/g, ' ');
      const account = truncate(effect.account, 16);
      const desc = effect.description.slice(0, 28) + (effect.description.length > 28 ? '...' : '');
      const time = new Date(effect.timestamp).toLocaleTimeString();

      table.push([
        chalk.cyan(type),
        chalk.gray(account),
        chalk.white(desc),
        chalk.gray(time),
      ]);
    });

    console.log(table.toString());
    console.log('');

  } catch (error) {
    spinner.fail('Failed to fetch effects');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

/**
 * Registers the effects command with the CLI
 * @param program - Commander program instance
 */
export function registerEffectsCommand(program: Command): void {
  program
    .command('effects <hash-or-account>')
    .description('View effects of a transaction or account activity')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-l, --limit <number>', 'Maximum number of effects (for accounts)', '20')
    .action(async (query: string, options: EffectsOptions) => {
      options.limit = parseInt(String(options.limit), 10);
      await effectsCommand(query, options);
    });
}
