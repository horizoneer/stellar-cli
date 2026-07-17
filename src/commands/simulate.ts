/**
 * Transaction simulation command
 * Simulates a transaction without broadcasting it to the network
 */

import ora from 'ora';
import chalk from 'chalk';
import { Command } from 'commander';
import { Network, HORIZON_URLS } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';
import axios from 'axios';

export interface SimulateOptions {
  network: Network;
  cost?: boolean;
  result?: boolean;
}

/**
 * Simulates a transaction by sending it to the simulate endpoint
 */
export async function simulateCommand(
  xdr: string,
  options: SimulateOptions
): Promise<void> {
  const spinner = ora({
    text: 'Simulating transaction...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    const baseUrl = HORIZON_URLS[options.network];
    const url = `${baseUrl}/transactions/simulate`;

    const response = await axios.post(url, { tx: xdr }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    spinner.succeed('Transaction simulated successfully!');

    const result = response.data;

    console.log('');
    console.log(chalk.blue.bold('🔮 Transaction Simulation Result'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');

    if (options.cost && result.fee_charged) {
      console.log(chalk.yellow.bold('💰 Cost Analysis:'));
      console.log(`  Fee Charged: ${chalk.white(result.fee_charged)} stroops`);
      console.log(`  Fee in XLM: ${chalk.white((result.fee_charged / 10000000).toFixed(7))} XLM`);
      console.log('');
    }

    if (options.result) {
      console.log(chalk.green.bold('✓ Execution Result:'));
      console.log(`  Success: ${chalk.white(result.success ? 'Yes' : 'No')}`);
      
      if (result.results) {
        console.log(`  Results: ${chalk.gray(JSON.stringify(result.results, null, 2))}`);
      }
      
      if (result.error) {
        console.log(`  Error: ${chalk.red(result.error)}`);
      }
      console.log('');
    }

    if (!options.cost && !options.result) {
      // Show summary by default
      console.log(chalk.cyan.bold('📊 Summary:'));
      console.log(`  Success: ${result.success ? chalk.green('✓ Yes') : chalk.red('✗ No')}`);
      console.log(`  Fee: ${chalk.white(result.fee_charged || 'N/A')} stroops`);
      
      if (result.results) {
        console.log(`  Operations: ${chalk.white(result.results.length)} executed`);
      }
      console.log('');
    }

    if (result.error) {
      console.log(chalk.red.bold('⚠️  Simulation Error:'));
      console.log(`  ${result.error}`);
      console.log('');
    }

  } catch (error) {
    spinner.fail('Transaction simulation failed');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

/**
 * Registers the simulate command with the CLI
 */
export function registerSimulateCommand(program: Command): void {
  program
    .command('simulate <xdr>')
    .description('Simulate a transaction without broadcasting it to the network')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'testnet')
    .option('-c, --cost', 'Show detailed cost analysis', false)
    .option('-r, --result', 'Show detailed execution result', false)
    .action(async (xdr: string, options: SimulateOptions) => {
      await simulateCommand(xdr, options);
    });
}
