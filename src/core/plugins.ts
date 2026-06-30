/**
 * Plugin system for Stellar Inspector
 */

import path from 'path';
import { Command } from 'commander';
import { readConfig } from './config';
import { printError, printInfo } from './formatter';

/**
 * Plugin interface
 */
export interface StellarPlugin {
  register(program: Command): void;
}

/**
 * Load plugins from config
 * @param program - Commander program instance
 */
export async function loadPlugins(program: Command): Promise<void> {
  const config = readConfig();
  const pluginPaths = config.plugins || [];

  if (pluginPaths.length === 0) {
    return;
  }

  for (const pluginPath of pluginPaths) {
    try {
      // Resolve absolute path
      const absolutePath = path.isAbsolute(pluginPath) 
        ? pluginPath 
        : path.resolve(process.cwd(), pluginPath);

      // Import the plugin
      const pluginModule = await import(absolutePath);
      const plugin: StellarPlugin = pluginModule.default || pluginModule;

      if (plugin.register && typeof plugin.register === 'function') {
        plugin.register(program);
        printInfo(`Loaded plugin: ${pluginPath}`);
      } else {
        printError(`Invalid plugin: ${pluginPath} - does not export a register function`);
      }
    } catch (error) {
      printError(`Failed to load plugin ${pluginPath}: ${(error as Error).message}`);
    }
  }
}
