/**
 * Offers command implementation
 * View Stellar offers for an account or trading pair
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { fetchAccountOffers, fetchOfferById, decodeOffer } from '../core/offers';
import { Network } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';

/**
 * Offers command options
 */
export interface OffersOptions {
  network: Network;
  account?: string;
  offerId?: string;
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
 * Offers command implementation
 * @param query - Account ID or offer ID
 * @param options - Command options
 */
export async function offersCommand(
  query: string,
  options: OffersOptions
): Promise<void> {
  // Validate network option
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use 'mainnet' or 'testnet'.`);
    process.exit(1);
  }

  const spinner = ora({
    text: 'Fetching offers...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    // Check if query is an offer ID (numeric) or account ID (starts with G)
    const isOfferId = /^\d+$/.test(query);

    if (isOfferId) {
      // Fetch single offer
      const offer = await fetchOfferById(query, options.network);
      spinner.succeed('Offer found!');

      const decoded = decodeOffer(offer);

      console.log('');
      console.log(chalk.blue.bold('📊 Offer Details'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log('');

      const table = new Table({
        head: [chalk.blue.bold('Field'), chalk.blue.bold('Value')],
        colWidths: [15, 65],
        style: { head: [], border: ['gray'] },
      });

      table.push(
        { [chalk.cyan('Offer ID')]: chalk.white(decoded.id) },
        { [chalk.cyan('Seller')]: chalk.gray(truncate(decoded.seller, 40)) },
        { [chalk.cyan('Selling')]: chalk.white(decoded.selling) },
        { [chalk.cyan('Buying')]: chalk.white(decoded.buying) },
        { [chalk.cyan('Amount')]: chalk.white(decoded.amount) },
        { [chalk.cyan('Price')]: chalk.white(decoded.price) }
      );

      console.log(table.toString());
      console.log('');

      const time = new Date(offer.last_modified_time).toLocaleString();
      console.log(chalk.gray(`Last modified: ${time}`));
      console.log('');

    } else {
      // Fetch offers for account
      if (!query.startsWith('G') || query.length !== 56) {
        spinner.fail('Invalid account ID or offer ID');
        console.log('');
        printInfo('Provide a valid account ID (starts with G, 56 chars) or offer ID (numeric)');
        console.log('');
        process.exit(1);
      }

      const response = await fetchAccountOffers(query, options.network);
      const offers = response._embedded.records.map(decodeOffer);

      spinner.succeed(`Found ${offers.length} offers`);

      console.log('');
      console.log(chalk.blue.bold('📊 Account Offers'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log('');
      console.log(chalk.cyan(`Account: ${truncate(query, 30)}`));
      console.log(chalk.gray(`Network: ${options.network.toUpperCase()}`));
      console.log('');

      if (offers.length === 0) {
        printInfo('No open offers for this account');
        console.log('');
        return;
      }

      const table = new Table({
        head: [
          chalk.blue.bold('ID'),
          chalk.blue.bold('Selling'),
          chalk.blue.bold('Buying'),
          chalk.blue.bold('Amount'),
          chalk.blue.bold('Price'),
        ],
        colWidths: [15, 18, 18, 15, 12],
        style: { head: [], border: ['gray'] },
      });

      offers.forEach((offer) => {
        table.push([
          chalk.gray(offer.id),
          chalk.cyan(offer.selling),
          chalk.white(offer.buying),
          chalk.gray(offer.amount),
          chalk.white(offer.price),
        ]);
      });

      console.log(table.toString());
      console.log('');
    }

  } catch (error) {
    spinner.fail('Failed to fetch offers');
    const message = handleError(error);
    printError(message);
    process.exit(1);
  }
}

/**
 * Registers the offers command with the CLI
 * @param program - Commander program instance
 */
export function registerOffersCommand(program: Command): void {
  program
    .command('offers <account-or-offer-id>')
    .description('View Stellar offers for an account or by offer ID')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .action(async (query: string, options: OffersOptions) => {
      await offersCommand(query, options);
    });
}
