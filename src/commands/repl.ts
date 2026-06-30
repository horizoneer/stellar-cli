/**
 * REPL command implementation
 * Interactive REPL mode for Stellar Inspector
 */

import readline from 'readline';
import chalk from 'chalk';
import { Command } from 'commander';
import { registerInspectCommand } from './inspect';
import { registerAccountCommand } from './account';
import { registerHistoryCommand } from './history';
import { registerFeeCommand } from './fee';
import { registerNetworkCommand } from './network';
import { registerValidateCommand } from './validate';
import { registerFeesCommand } from './fees';
import { registerLedgerCommand } from './ledger';
import { registerBalancesCommand } from './balances';
import { registerTransactionsCommand } from './transactions';
import { registerPaymentsCommand } from './payments';
import { registerExportCommand } from './export';
import { registerTrustlinesCommand } from './trustlines';
import { registerDataCommand } from './data';
import { registerClaimableBalancesCommand } from './claimablebalances';
import { registerServerInfoCommand } from './serverinfo';
import { registerPathfindCommand } from './pathfind';
import { registerOperationsCommand } from './operations';
import { registerTradesCommand } from './trades';
import { registerOrderbookCommand } from './orderbook';
import { registerAssetsHeldCommand } from './assetsheld';
import { registerSignersCommand } from './signers';
import { registerSearchCommand } from './search';
import { registerStreamCommand } from './stream';
import { registerWatchCommand } from './watch';
import { registerAssetsCommand } from './assets';
import { registerOffersCommand } from './offers';
import { registerEffectsCommand } from './effects';

export interface ReplOptions {
  network: string;
}

export async function replCommand(options: ReplOptions): Promise<void> {
  console.log('');
  console.log(chalk.blue.bold('🌟 Stellar Inspector REPL'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.cyan('Type commands without the "stellar-inspector" prefix'));
  console.log(chalk.gray('Type "help" for available commands, "exit" or "quit" to quit'));
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('stellar-inspector> '),
  });

  // Create a new program for REPL commands
  const createReplProgram = () => {
    const program = new Command();
    program.exitOverride();

    // Register all commands
    registerInspectCommand(program);
    registerAccountCommand(program);
    registerHistoryCommand(program);
    registerFeeCommand(program);
    registerNetworkCommand(program);
    registerValidateCommand(program);
    registerFeesCommand(program);
    registerLedgerCommand(program);
    registerBalancesCommand(program);
    registerTransactionsCommand(program);
    registerPaymentsCommand(program);
    registerExportCommand(program);
    registerTrustlinesCommand(program);
    registerDataCommand(program);
    registerClaimableBalancesCommand(program);
    registerServerInfoCommand(program);
    registerPathfindCommand(program);
    registerOperationsCommand(program);
    registerTradesCommand(program);
    registerOrderbookCommand(program);
    registerAssetsHeldCommand(program);
    registerSignersCommand(program);
    registerSearchCommand(program);
    registerStreamCommand(program);
    registerWatchCommand(program);
    registerAssetsCommand(program);
    registerOffersCommand(program);
    registerEffectsCommand(program);

    // Add help and exit commands
    program
      .command('help')
      .description('Show available commands')
      .action(() => {
        program.outputHelp();
      });

    program
      .command('exit')
      .description('Exit the REPL')
      .action(() => {
        rl.close();
      });

    program
      .command('quit')
      .description('Exit the REPL')
      .action(() => {
        rl.close();
      });

    return program;
  };

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input === 'exit' || input === 'quit') {
      rl.close();
      return;
    }

    try {
      // Parse the input as command line arguments
      const args = ['node', 'stellar-inspector', ...input.split(/\s+/)];
      const program = createReplProgram();
      await program.parseAsync(args);
    } catch (error) {
      if (error instanceof Error && error.name !== 'commander.help') {
        console.error(chalk.red(`Error: ${error.message}`));
      }
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('');
    console.log(chalk.gray('Goodbye!'));
    process.exit(0);
  });
}

export function registerReplCommand(program: Command): void {
  program
    .command('repl')
    .description('Enter interactive REPL mode')
    .option('-n, --network <network>', 'Stellar network (mainnet or testnet)', 'mainnet')
    .action(async (options: ReplOptions) => {
      await replCommand(options);
    });
}
