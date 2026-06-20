#!/usr/bin/env node
/**
 * Stellar Inspector CLI
 * A command-line tool for inspecting Stellar transactions and operations
 */

import { Command } from 'commander';
import { registerInspectCommand } from './commands/inspect';
import { registerAccountCommand } from './commands/account';
import { registerNetworkCommand } from './commands/network';
import { registerValidateCommand } from './commands/validate';
import { registerStreamCommand } from './commands/stream';
import { registerSearchCommand } from './commands/search';
import { registerAssetsCommand } from './commands/assets';
import { registerOffersCommand } from './commands/offers';
import { registerEffectsCommand } from './commands/effects';
import { registerFeesCommand } from './commands/fees';
import { registerLedgerCommand } from './commands/ledger';
import { registerBalancesCommand } from './commands/balances';
import { registerTransactionsCommand } from './commands/transactions';
import { registerPaymentsCommand } from './commands/payments';
import { registerExportCommand } from './commands/export';
import { registerTrustlinesCommand } from './commands/trustlines';
import { registerDataCommand } from './commands/data';
import { registerClaimableBalancesCommand } from './commands/claimablebalances';
import { registerServerInfoCommand } from './commands/serverinfo';
import { registerPathfindCommand } from './commands/pathfind';
import { registerOperationsCommand } from './commands/operations';
import { registerTradesCommand } from './commands/trades';
import { registerOrderbookCommand } from './commands/orderbook';
import { registerAssetsHeldCommand } from './commands/assetsheld';

// Create CLI program
const program = new Command();

// Program metadata
program
  .name('stellar-inspector')
  .description('CLI tool for inspecting Stellar transactions and operations')
  .version('1.0.0');

// Register commands
registerInspectCommand(program);
registerAccountCommand(program);
registerNetworkCommand(program);
registerValidateCommand(program);
registerStreamCommand(program);
registerSearchCommand(program);
registerAssetsCommand(program);
registerOffersCommand(program);
registerEffectsCommand(program);
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

// Parse arguments and execute
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
