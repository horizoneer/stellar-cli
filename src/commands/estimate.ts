/**
 * Estimate Command
 * Estimates transaction cost based on /fee_stats without submitting
 */

import fs from 'fs';
import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { Network, HORIZON_URLS } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';
import * as StellarBase from 'stellar-base';
import axios from 'axios';
import { HorizonError } from '../utils/errors';
import { FeeStats } from '../types';

export interface EstimateOptions {
  network: Network;
}

export async function fetchFeeStats(network: Network): Promise<FeeStats> {
  const baseUrl = HORIZON_URLS[network];
  const url = `${baseUrl}/fee_stats`;

  try {
    const response = await axios.get<FeeStats>(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new HorizonError('Fee stats not found', 404, 'NOT_FOUND');
      }
      if (error.response) {
        throw new HorizonError(
          error.response.data?.title || `HTTP ${error.response.status}`,
          error.response.status,
          error.response.data?.type || 'HTTP_ERROR'
        );
      }
    }
    throw error;
  }
}

export async function estimateCommand(xdrPath: string, options: EstimateOptions): Promise<void> {
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError('Invalid network "' + options.network + '". Use "mainnet" or "testnet".');
    process.exit(1);
  }

  // Read XDR file
  let xdr: string;
  try {
    xdr = fs.readFileSync(xdrPath, 'utf8').trim();
  } catch (error) {
    printError(`Failed to read XDR file: ${xdrPath}`);
    process.exit(1);
  }

  const spinner = ora({
    text: 'Estimating transaction cost...',
    spinner: 'dots',
    color: 'cyan',
  }).start();

  try {
    // Parse transaction from XDR
    const networkPassphrase = options.network === 'mainnet' ? StellarBase.Networks.PUBLIC : StellarBase.Networks.TESTNET;
    const transaction = StellarBase.TransactionBuilder.fromXDR(xdr, networkPassphrase);

    // Fetch fee stats
    const feeStats = await fetchFeeStats(options.network);

    spinner.succeed('Transaction cost estimated successfully!');

    console.log('');
    console.log(chalk.blue.bold('💰 Transaction Cost Estimator'));
    console.log(chalk.gray('─'.repeat(70)));
    console.log('');

    const operationsCount = transaction.operations.length;

    // Calculate fees using different percentiles
    const p10Fee = parseInt(feeStats.fee_charged.p10, 10);
    const p20Fee = parseInt(feeStats.fee_charged.p20, 10);
    const p30Fee = parseInt(feeStats.fee_charged.p30, 10);
    const p40Fee = parseInt(feeStats.fee_charged.p40, 10);
    const p50Fee = parseInt(feeStats.fee_charged.p50, 10);
    const p60Fee = parseInt(feeStats.fee_charged.p60, 10);
    const p70Fee = parseInt(feeStats.fee_charged.p70, 10);
    const p80Fee = parseInt(feeStats.fee_charged.p80, 10);
    const p90Fee = parseInt(feeStats.fee_charged.p90, 10);
    const p95Fee = parseInt(feeStats.fee_charged.p95, 10);
    const p99Fee = parseInt(feeStats.fee_charged.p99, 10);

    // Check if it's a FeeBumpTransaction
    if ('innerTransaction' in transaction) {
      printError('Fee bump transactions are not supported for estimation.');
      process.exit(1);
    }

    const estimateTable = new Table({
      head: [chalk.blue.bold('Metric'), chalk.blue.bold('Value')],
      colWidths: [30, 40],
      style: { head: [], border: ['gray'] },
    });

    estimateTable.push(
      [chalk.cyan('Source Account'), chalk.white(transaction.source)],
      [chalk.cyan('Number of Operations'), chalk.white(operationsCount.toString())],
      [chalk.cyan('Current Base Fee (stroops)'), chalk.white(feeStats.last_ledger_base_fee)],
      [chalk.cyan('Last Ledger Fee Charged (stroops)'), chalk.white(feeStats.last_ledger_fee_charged)],
      [chalk.cyan('Ledger Capacity Used'), chalk.white(`${feeStats.ledger_capacity_usage}%`)]
    );

    console.log(estimateTable.toString());
    console.log('');

    // Breakdown by percentile
    console.log(chalk.cyan.bold('📊 Estimated Fees by Percentile'));
    console.log(chalk.gray('─'.repeat(70)));
    console.log('');

    const feeBreakdownTable = new Table({
      head: [chalk.blue.bold('Percentile'), chalk.blue.bold('Fee per Op (stroops)'), chalk.blue.bold('Total Fee (stroops)'), chalk.blue.bold('Total Fee (XLM)')],
      colWidths: [15, 25, 25, 25],
      style: { head: [], border: ['gray'] },
    });

    const feePercentiles = [
      { label: 'P10', fee: p10Fee },
      { label: 'P20', fee: p20Fee },
      { label: 'P30', fee: p30Fee },
      { label: 'P40', fee: p40Fee },
      { label: 'P50', fee: p50Fee },
      { label: 'P60', fee: p60Fee },
      { label: 'P70', fee: p70Fee },
      { label: 'P80', fee: p80Fee },
      { label: 'P90', fee: p90Fee },
      { label: 'P95', fee: p95Fee },
      { label: 'P99', fee: p99Fee }
    ];

    feePercentiles.forEach(({ label, fee }) => {
      const totalStroops = fee * operationsCount;
      const totalXlm = totalStroops / 10000000;
      feeBreakdownTable.push([
        chalk.cyan(label),
        chalk.white(fee.toString()),
        chalk.white(totalStroops.toString()),
        chalk.white(`${totalXlm.toFixed(7)} XLM`)
      ]);
    });

    console.log(feeBreakdownTable.toString());
    console.log('');

    // List operations
    console.log(chalk.cyan.bold('📝 Operations in Transaction'));
    console.log(chalk.gray('─'.repeat(70)));
    console.log('');

    transaction.operations.forEach((op, index) => {
      console.log(`${chalk.cyan((index + 1).toString())}. ${op.type}`);
    });
    console.log('');

  } catch (error) {
    spinner.fail('Failed to estimate transaction cost');
    const { message } = handleError(error);
    printError(message);
    process.exit(1);
  }
}

export function registerEstimateCommand(program: Command): void {
  program
    .command('estimate <xdr-file>')
    .description('Estimate transaction cost from XDR without submitting')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .action(async (xdrPath: string, options: EstimateOptions) => {
      await estimateCommand(xdrPath, options);
    });
}
