# Contributing to Stellar Inspector CLI

Thank you for your interest in contributing! This guide outlines how you can help improve this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Contribution Levels](#contribution-levels)
  - [Beginner-Friendly (Good First Issues)](#beginner-friendly-good-first-issues)
  - [Intermediate Features](#intermediate-features)
  - [Advanced Optimizations](#advanced-optimizations)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

Be respectful and constructive. We're all here to build something great together.

## Getting Started

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run tests: `npm test`
5. Create a feature branch for your changes

## Contribution Levels

### Beginner-Friendly (Good First Issues)

Perfect for first-time contributors! These tasks involve implementing TODOs already marked in the codebase.

#### TODO: Implement Operation Decoders

The following operation types have placeholder implementations in `src/core/decoder.ts`. Each one needs a proper decoder function.

**1. `change_trust` Operation**
- Location: `src/core/decoder.ts`
- What to implement: Show trustor, trustee (asset issuer), asset code, and limit
- Difficulty: Easy
- Skills: TypeScript, basic Stellar concepts

**2. `allow_trust` Operation**
- Location: `src/core/decoder.ts`
- What to implement: Show trustor, asset code, and authorize flag
- Difficulty: Easy
- Skills: TypeScript, basic Stellar concepts

**3. `account_merge` Operation**
- Location: `src/core/decoder.ts`
- What to implement: Show account being merged and destination account
- Difficulty: Easy
- Skills: TypeScript, basic Stellar concepts

**4. `manage_buy_offer` Operation**
- Location: `src/core/decoder.ts`
- What to implement: Show offer ID, buying asset, selling asset, amount, and price
- Difficulty: Easy
- Skills: TypeScript, Stellar DEX concepts

**5. `manage_sell_offer` Operation**
- Location: `src/core/decoder.ts`
- What to implement: Show offer ID, buying asset, selling asset, amount, and price
- Difficulty: Easy
- Skills: TypeScript, Stellar DEX concepts

**6. `manage_data` Operation**
- Location: `src/core/decoder.ts`
- What to implement: Show data key and value
- Difficulty: Easy
- Skills: TypeScript, basic Stellar concepts

**7. `set_options` Operation**
- Location: `src/core/decoder.ts`
- What to implement: Show signer, thresholds, flags, and inflation destination
- Difficulty: Medium
- Skills: TypeScript, Stellar account concepts

**8. `invoke_host_function` Operation (Soroban)**
- Location: `src/core/decoder.ts`
- What to implement: Show function name, arguments, and result (for Soroban smart contracts)
- Difficulty: Medium
- Skills: TypeScript, Soroban smart contract basics

---

### Intermediate Features

Ready for a bigger challenge? These features require more design thinking and implementation work.

**1. Transaction Search and Filter**
- Add ability to search transactions by account
- Filter by date range, asset type, operation type
- Requires new CLI commands and API integration

**2. Account Command**
- Create `account` command to inspect Stellar accounts
- Show balances, signers, thresholds, flags
- Display recent transactions

**3. Asset Command**
- Create `asset` command to inspect custom assets
- Show asset details, trustlines, and trading pairs
- Display price history and volume

**4. Ledger Command**
- Create `ledger` command to inspect ledgers
- Show transactions in a ledger
- Display sequence, close time, protocol version

**5. Batch Inspect Mode**
- Accept multiple transaction hashes at once
- Display summary table of all transactions
- Export results to CSV or JSON

**6. Configuration File Support**
- Read config from `.stellar-inspectorrc` or `~/.stellar-inspector.json`
- Set default network, API keys, output preferences
- Support environment variables

**7. Transaction Validation**
- Verify transaction signatures
- Check if transaction is valid
- Display any errors or warnings

---

### Advanced Optimizations

For experienced contributors who want to tackle complex features.

**1. XDR Decoding**
- Parse and decode transaction envelope XDR
- Show detailed operation structure
- Decode and display all XDR types (Memo, SignerKey, etc.)

**2. Offline Mode**
- Support decoding transactions from XDR without network
- Parse envelope locally
- Validate signatures offline

**3. Caching Layer**
- Cache Horizon API responses
- Reduce API calls for repeated queries
- Support cache expiration and invalidation

**4. Multiple Horizon Endpoints**
- Support custom Horizon URLs
- Failover to backup endpoints
- Load balancing across endpoints

**5. Pagination Support**
- Handle paginated API responses
- Stream large operation lists
- Implement cursor-based navigation

**6. Real-time Monitoring**
- Watch for new transactions
- Stream operations in real-time
- Websocket integration with Horizon

**7. Export Formats**
- Export to CSV, JSON, YAML
- Generate reports
- Create visualizations (ASCII charts)

**8. Plugin System**
- Support custom operation decoders
- Allow users to extend functionality
- Dynamic loading of plugins

## Development Workflow

1. **Create a branch**: `git checkout -b feature/your-feature-name`
2. **Make changes**: Write clean, documented code
3. **Test locally**: `npm run dev -- inspect <hash>`
4. **Run tests**: `npm test`
5. **Build**: `npm run build`
6. **Commit**: Use conventional commit messages
7. **Push**: `git push origin feature/your-feature-name`
8. **Open PR**: Describe your changes clearly

## Coding Standards

- **TypeScript**: Strict mode is enabled
- **Comments**: Document all public functions
- **Naming**: Use camelCase for functions, PascalCase for types
- **Formatting**: Follow existing code style
- **Error handling**: Use custom error classes
- **Async**: Use async/await, avoid raw promises

## Testing Guidelines

- Write tests for new features
- Maintain or improve code coverage
- Use descriptive test names
- Mock external API calls
- Test edge cases and error conditions

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add your change to the PR description
4. Link any related issues
5. Request review from maintainers
6. Address review feedback

---

Thank you for contributing! 🚀
