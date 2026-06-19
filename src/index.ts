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

// Parse arguments and execute
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
