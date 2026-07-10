/**
 * Sequence Command
 * Shows account's current sequence number and can generate bump sequence XDR
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccount, Network, isAccountId } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';
import * as StellarBase from 'stellar-base';

export interface SequenceOptions {
  network: Network;
  bump?: number;
}

export async function sequenceCommand(accountId: string, options: SequenceOptions): Promise<void> {
  if (!isAccountId(accountId)) {
    printError('Invalid account ID. Must start with G followed by 55 alphanumeric characters.');
    process.exit(1);
  }

  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError('Invalid network "' + options.network + '". Use "mainnet" or "testnet".');
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching account sequence...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const account = await fetchAccount(accountId, options.network);
    spinner.succeed('Account sequence fetched successfully!');

    const currentSequence = BigInt(account.sequence);
    const nextSequence = currentSequence + 1n;

    console.log('');
    console.log(chalk.blue.bold('🔢 Sequence Number Checker'));
    console.log(chalk.gray('─'.repeat(70)));
    console.log('');

    const sequenceTable = new Table({
      head: [chalk.blue.bold('Field'), chalk.blue.bold('Value')],
      colWidths: [30, 40],
      style: { head: [], border: ['gray'] },
    });

    sequenceTable.push(
      [chalk.cyan('Account ID'), chalk.white(accountId)],
      [chalk.cyan('Current Sequence Number'), chalk.white(currentSequence.toString())],
      [chalk.cyan('Next Valid Sequence Number'), chalk.white(nextSequence.toString())]
    );

    console.log(sequenceTable.toString());
    console.log('');

    // If bump flag is provided, generate bump sequence XDR
    if (options.bump !== undefined) {
      const targetSequence = BigInt(options.bump);
      if (targetSequence <= currentSequence) {
        printError(`Target sequence (${targetSequence}) must be greater than current sequence (${currentSequence})`);
        process.exit(1);
      }

      console.log(chalk.cyan.bold('📋 Bump Sequence Operation XDR'));
      console.log(chalk.gray('─'.repeat(70)));
      console.log('');

      // Create a dummy account to build the operation
      const sourceAccount = new StellarBase.Account(accountId, currentSequence.toString());
      const builder = new StellarBase.TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: options.network === 'mainnet' ? StellarBase.Networks.PUBLIC : StellarBase.Networks.TESTNET,
      });

      builder.addOperation(
        StellarBase.Operation.bumpSequence({
          bumpTo: targetSequence.toString(),
        })
      );

      builder.setTimeout(300);
      const transaction = builder.build();

      console.log(chalk.white('Transaction Envelope XDR (unsigned):'));
      console.log(chalk.gray(transaction.toEnvelope().toXDR()));
      console.log('');
    }

  } catch (error) {
    spinner.fail('Failed to fetch account sequence');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerSequenceCommand(program: Command): void {
  program
    .command('sequence <account-id>')
    .description('Check account sequence number and generate bump sequence XDR')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-b, --bump <sequence>', 'Generate bump sequence XDR to target sequence number')
    .action(async (accountId: string, options: SequenceOptions) => {
      // Parse --bump as number if provided
      if (options.bump !== undefined && typeof options.bump === 'string') {
        options.bump = parseInt(options.bump, 10);
      }
      await sequenceCommand(accountId, options);
    });
}
