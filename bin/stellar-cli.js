#!/usr/bin/env node

import { program } from 'commander'
import { inspectCommand } from '../src/commands/inspect.js'
import { accountCommand } from '../src/commands/account.js'

program
  .name('stellar-cli')
  .description('Inspect and decode Stellar transactions from your terminal')
  .version('0.1.0')

program
  .command('inspect <hash>')
  .description('Decode a transaction by its hash')
  .option('-n, --network <network>', 'network to use: mainnet or testnet', 'mainnet')
  .option('-r, --raw', 'print raw JSON output')
  .action(inspectCommand)

program
  .command('account <address>')
  .description('Look up a Stellar account')
  .option('-n, --network <network>', 'network to use: mainnet or testnet', 'mainnet')
  .action(accountCommand)

program.parse()