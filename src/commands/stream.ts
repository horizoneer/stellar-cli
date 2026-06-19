/**
 * Stream command implementation
 * Streams real-time transactions or payments from Stellar network
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { Network, HORIZON_URLS } from '../core/horizon';
import { printError, printInfo } from '../core/formatter';
import { handleError } from '../utils/errors';

/**
 * Stream command options
 */
export interface StreamOptions {
  network: Network;
  type: 'transactions' | 'payments' | 'operations';
  limit: number;
  account?: string;
}

/**
 * Formats an amount for display
 */
function formatAmount(amount: string, asset: string = 'XLM'): string {
  return `${parseFloat(amount).toLocaleString('en-US', { maximumFractionDigits: 7 })} ${asset}`;
}

/**
 * Truncates a string for display
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, Math.ceil(maxLen / 2))}...${str.slice(-Math.floor(maxLen / 2))}`;
}

/**
 * Streams transactions from Horizon using SSE
 * @param options - Command options
 */
export async function streamCommand(options: StreamOptions): Promise<void> {
  // Validate network option
  if (options.network !== 'mainnet' && options.network !== 'testnet') {
    printError(`Invalid network "${options.network}". Use 'mainnet' or 'testnet'.`);
    process.exit(1);
  }

  const baseUrl = HORIZON_URLS[options.network];
  let endpoint = `${baseUrl}/${options.type}`;
  
  if (options.account) {
    endpoint = `${baseUrl}/accounts/${options.account}/${options.type}`;
  }

  console.log('');
  console.log(chalk.blue.bold('📡 Stellar Event Streamer'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log('');
  console.log(chalk.cyan(`Network: ${options.network.toUpperCase()}`));
  console.log(chalk.cyan(`Streaming: ${options.type}`));
  console.log(chalk.gray(`Endpoint: ${endpoint}`));
  if (options.limit > 0) {
    console.log(chalk.gray(`Limit: ${options.limit} events`));
  }
  console.log('');
  console.log(chalk.gray('Press Ctrl+C to stop streaming...'));
  console.log('');

  // Note: For real streaming, we would use EventSource or similar
  // This is a simplified version that explains how to implement streaming
  
  let eventCount = 0;

  try {
    // Using fetch with streaming
    const response = await fetch(endpoint, {
      headers: {
        'Accept': 'text/event-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    if (!reader) {
      throw new Error('Unable to get response reader');
    }

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            eventCount++;

            // Display the event
            displayEvent(data, options.type, eventCount);

            // Check limit
            if (options.limit > 0 && eventCount >= options.limit) {
              console.log('');
              printInfo(`Reached limit of ${options.limit} events. Stopping.`);
              process.exit(0);
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    }
  } catch (error) {
    // If fetch fails (common in Node.js without polyfill), show instructions
    console.log(chalk.yellow('⚠ Streaming requires additional setup in Node.js'));
    console.log('');
    console.log(chalk.cyan('To enable streaming, install eventsource:'));
    console.log(chalk.white('  npm install eventsource'));
    console.log('');
    console.log(chalk.cyan('Or use the Horizon API directly:'));
    console.log(chalk.white(`  curl "${endpoint}?cursor=now" -H "Accept: text/event-stream"`));
    console.log('');
    
    // Show alternative: fetch latest transactions instead
    printInfo('Showing latest transactions instead...');
    console.log('');
    
    await showLatestTransactions(options);
  }
}

/**
 * Displays a streaming event
 */
function displayEvent(data: Record<string, unknown>, type: string, count: number): void {
  const timestamp = new Date().toLocaleTimeString();
  console.log(chalk.gray(`[${timestamp}] Event #${count}`));

  if (type === 'transactions' && data.hash) {
    const txData = data as { hash: string; source_account: string; operation_count: number; fee_paid: number };
    console.log(chalk.cyan(`  TX: ${truncate(txData.hash, 20)}`));
    console.log(chalk.gray(`  Source: ${truncate(txData.source_account, 20)}`));
    console.log(chalk.gray(`  Operations: ${txData.operation_count}, Fee: ${(txData.fee_paid / 10000).toFixed(4)} XLM`));
  } else if (type === 'payments' && data.type) {
    const payData = data as { type: string; from?: string; to?: string; amount?: string; asset_type?: string };
    console.log(chalk.cyan(`  Payment: ${payData.type}`));
    if (payData.from && payData.to) {
      console.log(chalk.gray(`  From: ${truncate(payData.from, 20)}`));
      console.log(chalk.gray(`  To: ${truncate(payData.to, 20)}`));
    }
    if (payData.amount) {
      const asset = payData.asset_type === 'native' ? 'XLM' : payData.asset_type;
      console.log(chalk.gray(`  Amount: ${formatAmount(payData.amount, asset)}`));
    }
  }

  console.log('');
}

/**
 * Shows latest transactions as fallback
 */
async function showLatestTransactions(options: StreamOptions): Promise<void> {
  const baseUrl = HORIZON_URLS[options.network];
  
  try {
    const response = await fetch(`${baseUrl}/transactions?limit=5&order=desc`);
    const data = await response.json() as { _embedded: { records: Array<Record<string, unknown>> } };
    
    console.log(chalk.cyan.bold('📋 Latest Transactions'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');

    const table = new Table({
      head: [chalk.blue.bold('#'), chalk.blue.bold('Hash'), chalk.blue.bold('Source'), chalk.blue.bold('Ops')],
      colWidths: [5, 25, 30, 8],
      style: { head: [], border: ['gray'] },
    });

    data._embedded.records.forEach((tx: Record<string, unknown>, i: number) => {
      const txData = tx as { hash: string; source_account: string; operation_count: number };
      table.push([
        chalk.gray((i + 1).toString()),
        chalk.cyan(truncate(txData.hash, 20)),
        chalk.gray(truncate(txData.source_account, 25)),
        chalk.white(txData.operation_count.toString()),
      ]);
    });

    console.log(table.toString());
    console.log('');
    printInfo('Use stellar-cli inspect <hash> for more details');
    console.log('');
  } catch (error) {
    printError('Failed to fetch latest transactions');
    handleError(error);
  }
}

/**
 * Registers the stream command with the CLI
 * @param program - Commander program instance
 */
export function registerStreamCommand(program: Command): void {
  program
    .command('stream')
    .description('Stream real-time transactions or payments from Stellar network')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .option('-t, --type <type>', 'Stream type (transactions, payments, operations)', 'transactions')
    .option('-l, --limit <number>', 'Stop after N events (0 for unlimited)', '0')
    .option('-a, --account <account>', 'Stream events for a specific account')
    .action(async (options: StreamOptions) => {
      options.limit = parseInt(String(options.limit), 10);
      await streamCommand(options);
    });
}
