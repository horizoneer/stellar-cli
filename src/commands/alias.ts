/**
 * Alias command implementation
 * Manage human-readable aliases for Stellar addresses
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { setAlias, getAllAliases, removeAlias } from '../core/config';
import { isAccountId } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';

export interface AliasOptions {
  // No options needed for now
}

export function registerAliasCommand(program: Command): void {
  const aliasCommand = program
    .command('alias')
    .description('Manage account aliases');

  // alias set <name> <address>
  aliasCommand
    .command('set <name> <address>')
    .description('Set an alias for a Stellar address')
    .action(async (name: string, address: string) => {
      if (!name) {
        printError('Alias name is required');
        process.exit(1);
      }
      if (!isAccountId(address)) {
        printError('Invalid Stellar account ID. Must start with G followed by 55 alphanumeric characters.');
        process.exit(1);
      }

      try {
        setAlias(name, address);
        printInfo(`Alias "${name}" set to ${address}`);
      } catch (error) {
        printError(`Failed to set alias: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // alias list
  aliasCommand
    .command('list')
    .description('List all aliases')
    .action(async () => {
      const aliases = getAllAliases();
      const aliasEntries = Object.entries(aliases);

      if (aliasEntries.length === 0) {
        printInfo('No aliases configured');
        return;
      }

      console.log('');
      console.log(chalk.blue.bold('📋 Account Aliases'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log('');

      const table = new Table({
        head: [chalk.blue.bold('Alias'), chalk.blue.bold('Address')],
        colWidths: [20, 60],
        style: { head: [], border: ['gray'] },
      });

      for (const [name, address] of aliasEntries) {
        table.push([chalk.cyan(name), chalk.white(address)]);
      }

      console.log(table.toString());
      console.log('');
    });

  // alias remove <name>
  aliasCommand
    .command('remove <name>')
    .description('Remove an alias')
    .action(async (name: string) => {
      if (!name) {
        printError('Alias name is required');
        process.exit(1);
      }

      try {
        const aliases = getAllAliases();
        if (!aliases[name]) {
          printError(`Alias "${name}" not found`);
          process.exit(1);
        }
        removeAlias(name);
        printInfo(`Alias "${name}" removed`);
      } catch (error) {
        printError(`Failed to remove alias: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}