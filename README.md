# Stellar Inspector CLI

📡 A command-line tool for inspecting Stellar transactions and operations.

A modern, user-friendly CLI that fetches transaction details from the Horizon API and displays them in beautiful, colored terminal output.

## Features

- ✅ Fetch transactions by hash from Horizon API
- ✅ Support for mainnet and testnet
- ✅ Beautiful colored terminal output
- ✅ Decoded operation details (payment, create_account, etc.)
- ✅ Raw JSON output mode
- ✅ Human-readable error messages

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link

# Use the CLI
stellar-cli  inspect <hash-or-xdr>

# Or run directly
npm run dev -- inspect <hash-or-xdr>
```

## Usage

```bash
# Inspect a transaction on mainnet (default)
stellar-cli  inspect <transaction-hash>

# Inspect a transaction on testnet
stellar-cli  inspect <transaction-hash> --network testnet

# Show raw JSON output
stellar-cli  inspect <transaction-hash> --raw

# Short flags
stellar-cli  inspect <transaction-hash> -n testnet -r

# Show help
stellar-cli  --help

# Show version
stellar-cli  --version
```

## Examples

```bash
# View a specific transaction
stellar-cli inspect abc123def456... --network mainnet

# Output:
# 📡 Stellar Transaction Inspector
# ─────────────────────────────────────────────────
# 
# ┌──────────────┬─────────────────────────────────┐
# │ Field        │ Value                           │
# ├──────────────┼─────────────────────────────────┤
# │ Hash         │ abc123...456def                 │
# │ Source       │ GABC...XYZ                      │
# │ Fee          │ 0.0000100 XLM                   │
# │ Memo         │ None                            │
# │ Status       │ ✓ Success                       │
# │ Created      │ Jan 1, 2024, 12:00:00 AM EST    │
# └──────────────┴─────────────────────────────────┘
```

## Development

```bash
# Run in development mode (with ts-node)
npm run dev -- inspect <hash>

# Build TypeScript to JavaScript
npm run build

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint (if configured)
npm run lint
```

## Project Structure

```
stellar-cli/
├── src/
│   ├── types/          # TypeScript interfaces
│   │   └── index.ts
│   ├── utils/          # Utility functions
│   │   └── errors.ts
│   ├── core/           # Core business logic
│   │   ├── horizon.ts  # API client
│   │   ├── decoder.ts  # Data transformation
│   │   └── formatter.ts # Terminal output
│   ├── commands/       # CLI commands
│   │   └── inspect.ts
│   └── index.ts        # CLI entry point
├── tests/              # Test files
├── dist/               # Compiled JavaScript
└── package.json
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Build the project: `npm run build`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Horizon API Reference](https://developers.stellar.org/api/horizon)
- [Stellar SDK](https://github.com/Stellar/js-stellar-sdk)

## Acknowledgments

Built with:
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Chalk](https://github.com/chalk/chalk) - Terminal styling
- [cli-table3](https://github.com/cli-table/cli-table3) - ASCII tables
- [Ora](https://github.com/sindresorhus/ora) - Spinners
- [Axios](https://github.com/axios/axios) - HTTP client
