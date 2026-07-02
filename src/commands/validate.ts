/**
 * Validate command implementation
 * Validates and decodes Stellar XDR (transaction envelopes)
 */

import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { validateXdr, formatXdrOutput } from '../core/xdr';
import { printError } from '../core/formatter';
import { handleError } from '../utils/errors';

/**
 * Validate command options
 */
export interface ValidateOptions {
  decode: boolean;
}

/**
 * Validate command implementation
 * Validates XDR and optionally decodes it
 * @param xdr - XDR string to validate
 * @param options - Command options
 */
export async function validateCommand(
  xdr: string,
  options: ValidateOptions
): Promise<void> {
  // Create spinner
  const spinner = ora({
    text: 'Validating XDR...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    // Validate the XDR
    const validation = validateXdr(xdr);

    if (!validation.valid) {
      spinner.fail('XDR validation failed');
      console.log('');
      console.log(chalk.red.bold('✗ Invalid XDR'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log('');
      console.log(chalk.red(`Error: ${validation.error}`));
      console.log('');
      process.exit(1);
    }

    spinner.succeed('XDR is valid!');

    // Display formatted output
    console.log(formatXdrOutput(xdr, 'XDR Validation Result'));

    if (options.decode) {
      console.log(chalk.cyan.bold('🔍 Decoded Contents'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log('');
      console.log(chalk.gray('For full XDR decoding, use the stellar-sdk:'));
      console.log('');
      console.log(chalk.white('  const StellarSdk = require("@stellar/stellar-sdk");'));
      console.log(chalk.white('  const tx = StellarSdk.TransactionBuilder.fromXDR(xdr, "Stellar Network");'));
      console.log(chalk.white('  console.log(tx);'));
      console.log('');
    }

  } catch (error) {
    spinner.fail('XDR validation failed');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

/**
 * Registers the validate command with the CLI
 * @param program - Commander program instance
 */
export function registerValidateCommand(program: Command): void {
  program
    .command('validate <xdr>')
    .description('Validate a Stellar transaction XDR envelope')
    .option('-d, --decode', 'Show decoding instructions', false)
    .action(async (xdr: string, options: ValidateOptions) => {
      await validateCommand(xdr, options);
    });
}
