/**
 * Account command implementation
 * Fetches and displays Stellar account details
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccount, formatBalance, calculateTotalXlm } from '../core/account';
import { Network } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';

/**
 * Account command options
 */
export interface AccountOptions {
  network: Network;
  balances: boolean;
  signers: boolean;
}

/**
 * Account command implementation
 * Fetches an account and displays formatted output
 * @param accountId - Stellar account ID (G...)
 * @param options - Command options
 */
export async function accountCommand(
  accountId: string,
  options: AccountOptions
): Promise<void> {
  // Validate network option
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use 'mainnet' or 'testnet'.`);
    process.exit(1);
  }

  // Validate account ID format
  if (!accountId.startsWith('G') || accountId.length !== 56) {
    printError('Invalid account ID. Must be a valid Stellar public key (starts with G, 56 characters).');
    process.exit(1);
  }

  // Create and start spinner
  const spinner = ora({
    text: 'Fetching account...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const account = await fetchAccount(accountId, options.network);
    spinner.succeed('Account fetched successfully!');

    console.log('');
    console.log(chalk.blue.bold('👤 Stellar Account Inspector'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');

    // Account info table
    const infoTable = new Table({
      head: [chalk.blue.bold('Field'), chalk.blue.bold('Value')],
      colWidths: [20, 60],
      style: { head: [], border: ['gray'] },
    });

    const truncatedAccount = `${accountId.slice(0, 20)}...${accountId.slice(-16)}`;
    infoTable.push(
      { [chalk.cyan('Account ID')]: chalk.white(truncatedAccount) },
      { [chalk.cyan('Sequence')]: chalk.gray(account.sequence) },
      { [chalk.cyan('Subentries')]: chalk.white(account.subentry_count.toString()) },
      { [chalk.cyan('Last Modified')]: chalk.gray(new Date(account.last_modified_time).toLocaleString()) }
    );

    console.log(infoTable.toString());
    console.log('');

    // Balances
    if (options.balances || !options.signers) {
      console.log(chalk.cyan.bold('💰 Balances'));
      console.log(chalk.gray('─'.repeat(50)));

      const balanceTable = new Table({
        head: [chalk.blue.bold('Asset'), chalk.blue.bold('Balance'), chalk.blue.bold('Limit')],
        colWidths: [25, 25, 30],
        style: { head: [], border: ['gray'] },
      });

      account.balances.forEach((balance) => {
        const assetDisplay = balance.asset_type === 'native' 
          ? 'XLM (Native)' 
          : `${balance.asset_code}:${balance.asset_issuer?.slice(0, 8)}...`;
        
        const balanceDisplay = parseFloat(balance.balance).toLocaleString('en-US', {
          maximumFractionDigits: 7,
        });

        const limitDisplay = balance.limit 
          ? parseFloat(balance.limit).toLocaleString('en-US', { maximumFractionDigits: 7 })
          : '∞';

        balanceTable.push([
          chalk.cyan(assetDisplay),
          chalk.white(balanceDisplay),
          chalk.gray(limitDisplay),
        ]);
      });

      console.log(balanceTable.toString());
      console.log('');

      const totalXlm = calculateTotalXlm(account.balances);
      printInfo(`Total XLM: ${totalXlm.toFixed(7)} XLM`);
      console.log('');
    }

    // Signers
    if (options.signers || (!options.balances && !options.signers)) {
      console.log(chalk.cyan.bold('🔑 Signers'));
      console.log(chalk.gray('─'.repeat(50)));

      const signerTable = new Table({
        head: [chalk.blue.bold('Key'), chalk.blue.bold('Type'), chalk.blue.bold('Weight')],
        colWidths: [50, 25, 15],
        style: { head: [], border: ['gray'] },
      });

      account.signers.forEach((signer) => {
        const keyDisplay = signer.key.length > 45 
          ? `${signer.key.slice(0, 20)}...${signer.key.slice(-20)}`
          : signer.key;
        
        signerTable.push([
          chalk.gray(keyDisplay),
          chalk.cyan(signer.type.replace(/_/g, ' ')),
          chalk.white(signer.weight.toString()),
        ]);
      });

      console.log(signerTable.toString());
      console.log('');

      // Thresholds
      console.log(chalk.gray(`Thresholds - Low: ${account.thresholds.low_threshold}, Medium: ${account.thresholds.med_threshold}, High: ${account.thresholds.high_threshold}`));
      console.log('');
    }

    // Flags
    if (account.flags.auth_required || account.flags.auth_revocable || account.flags.auth_immutable) {
      console.log(chalk.yellow.bold('⚠ Account Flags'));
      console.log(chalk.gray('─'.repeat(50)));
      if (account.flags.auth_required) console.log(chalk.gray('  • Auth Required'));
      if (account.flags.auth_revocable) console.log(chalk.gray('  • Auth Revocable'));
      if (account.flags.auth_immutable) console.log(chalk.gray('  • Auth Immutable'));
      console.log('');
    }

  } catch (error) {
    spinner.fail('Failed to fetch account');
    const message = handleError(error);
    printError(message);
    process.exit(1);
  }
}

/**
 * Registers the account command with the CLI
 * @param program - Commander program instance
 */
export function registerAccountCommand(program: Command): void {
  program
    .command('account <account-id>')
    .description('View Stellar account details, balances, and signers')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-b, --balances', 'Show only balances', false)
    .option('-s, --signers', 'Show only signers', false)
    .action(async (accountId: string, options: AccountOptions) => {
      await accountCommand(accountId, options);
    });
}
