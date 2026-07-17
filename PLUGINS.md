# Plugin System Documentation

The Stellar Inspector CLI supports a plugin system that allows you to extend its functionality with custom commands and features.

## Plugin Structure

A plugin is a JavaScript/TypeScript module that exports a function to register commands with the CLI program.

### Basic Plugin Template

```typescript
import { Command } from 'commander';

export interface PluginOptions {
  // Plugin-specific options
}

export function registerPlugin(program: Command, options?: PluginOptions): void {
  // Register your custom commands here
  program
    .command('my-command')
    .description('My custom command')
    .action(async () => {
      console.log('Hello from my plugin!');
    });
}
```

## Example Plugin

Here's a complete example of a plugin that adds a custom analytics command:

```typescript
// plugins/analytics-plugin.ts
import { Command } from 'commander';
import axios from 'axios';
import { performanceMonitor } from '../src/utils/performance';

export function registerPlugin(program: Command): void {
  program
    .command('analytics')
    .description('Show performance analytics for API calls')
    .option('--endpoint <name>', 'Filter by specific endpoint')
    .action(async (options) => {
      const summary = performanceMonitor.getSummary();
      
      console.log('\n📊 Performance Analytics');
      console.log('─'.repeat(40));
      console.log(`Total Requests: ${summary.totalRequests}`);
      console.log(`Successful: ${summary.successfulRequests}`);
      console.log(`Failed: ${summary.failedRequests}`);
      console.log(`Avg Response Time: ${summary.averageResponseTime.toFixed(2)}ms`);
      
      if (summary.slowestEndpoint) {
        console.log(`\nSlowest Endpoint: ${summary.slowestEndpoint.endpoint}`);
        console.log(`Avg Time: ${summary.slowestEndpoint.avgTime.toFixed(2)}ms`);
      }
      
      if (options.endpoint) {
        const metrics = performanceMonitor.getEndpointMetrics(options.endpoint);
        console.log(`\n📈 Metrics for ${options.endpoint}:`);
        console.log(`Requests: ${metrics.length}`);
        const avgTime = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
        console.log(`Avg Time: ${avgTime.toFixed(2)}ms`);
      }
    });
}
```

## Loading Plugins

Plugins can be loaded in two ways:

### 1. Via Config File

Add plugin paths to your `.stellarrc` file:

```json
{
  "plugins": [
    "./plugins/analytics-plugin",
    "./plugins/custom-plugin"
  ]
}
```

### 2. Programmatically

Plugins are automatically loaded from the config file during CLI initialization in `src/index.ts`.

## Plugin API

### Command Registration

Plugins have access to the full Commander.js API for registering commands:

- `program.command(name)` - Register a new command
- `program.option(flags, description)` - Add command options
- `program.action(callback)` - Define command handler

### Accessing Core Modules

Plugins can import and use any of the core modules:

- `src/core/horizon.ts` - Horizon API integration
- `src/core/config.ts` - Configuration management
- `src/utils/errors.ts` - Error handling
- `src/utils/logger.ts` - Logging system
- `src/utils/performance.ts` - Performance monitoring

### Example: Using Horizon API

```typescript
import { fetchAccount, Network } from '../src/core/horizon';

export function registerPlugin(program: Command): void {
  program
    .command('quick-balance <account>')
    .description('Quickly check account balance')
    .action(async (account) => {
      const accountData = await fetchAccount(account, 'mainnet');
      console.log(`Balance: ${accountData.balances[0].balance} XLM`);
    });
}
```

## Plugin Best Practices

1. **Error Handling**: Always handle errors gracefully and use the CLI's error utilities
2. **Logging**: Use the winston logger for consistent logging
3. **Validation**: Validate user inputs before processing
4. **Documentation**: Provide clear help text for your commands
5. **Testing**: Write tests for your plugin functionality

## Plugin Configuration

Plugins can accept configuration options:

```typescript
export interface PluginOptions {
  apiKey?: string;
  timeout?: number;
}

export function registerPlugin(program: Command, options?: PluginOptions): void {
  // Use options in your plugin
  const timeout = options?.timeout || 5000;
}
```

## Distributed Plugins

To distribute your plugin as an npm package:

1. Create a package.json with a `stellar-cli-plugin` keyword
2. Export a `registerPlugin` function as the default export
3. Users can install via npm and add to their config

```json
{
  "name": "my-stellar-plugin",
  "keywords": ["stellar-cli-plugin"],
  "main": "dist/index.js"
}
```

## Security Considerations

- Never hardcode sensitive data in plugins
- Validate all external inputs
- Use environment variables for configuration
- Follow the principle of least privilege
