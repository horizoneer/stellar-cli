/**
 * Config file handling for Stellar Inspector CLI
 * Reads and writes .stellarrc JSON config file
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Config interface
 */
export interface StellarConfig {
  network?: 'mainnet' | 'testnet';
  outputFormat?: 'json' | 'csv' | 'terminal';
  defaultLimit?: number;
  plugins?: string[];
  aliases?: Record<string, string>;
}

const CONFIG_FILE_NAME = '.stellarrc';

/**
 * Validates the config object
 */
function validateConfig(config: unknown): config is StellarConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const c = config as Record<string, unknown>;

  // Validate network
  if (c.network !== undefined && !['mainnet', 'testnet'].includes(c.network as string)) {
    return false;
  }

  // Validate outputFormat
  if (c.outputFormat !== undefined && !['json', 'csv', 'terminal'].includes(c.outputFormat as string)) {
    return false;
  }

  // Validate defaultLimit
  if (c.defaultLimit !== undefined && typeof c.defaultLimit !== 'number') {
    return false;
  }

  // Validate plugins
  if (c.plugins !== undefined && !Array.isArray(c.plugins)) {
    return false;
  }

  // Validate aliases
  if (c.aliases !== undefined && (typeof c.aliases !== 'object' || c.aliases === null)) {
    return false;
  }

  return true;
}

/**
 * Finds the config file in current directory or home directory
 */
export function findConfigFile(): string | null {
  // Check current directory first
  const cwdConfig = path.join(process.cwd(), CONFIG_FILE_NAME);
  if (fs.existsSync(cwdConfig)) {
    return cwdConfig;
  }

  // Check home directory
  const homeConfig = path.join(os.homedir(), CONFIG_FILE_NAME);
  if (fs.existsSync(homeConfig)) {
    return homeConfig;
  }

  return null;
}

/**
 * Reads the config file
 */
export function readConfig(): StellarConfig {
  const configPath = findConfigFile();
  if (!configPath) {
    return {};
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    if (validateConfig(parsed)) {
      return parsed;
    }
    return {};
  } catch (error) {
    return {};
  }
}

/**
 * Writes the config file
 */
export function writeConfig(config: StellarConfig, location?: string): void {
  const configPath = location || path.join(os.homedir(), CONFIG_FILE_NAME);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Merges config with defaults
 */
export function mergeConfig(
  config: StellarConfig,
  defaults: StellarConfig
): StellarConfig {
  return { ...defaults, ...config };
}

/**
 * Sets an alias for an account address
 * @param name - Alias name
 * @param address - Stellar account address
 * @param location - Optional config file location
 */
export function setAlias(name: string, address: string, location?: string): void {
  const config = readConfig();
  config.aliases = config.aliases || {};
  config.aliases[name] = address;
  writeConfig(config, location);
}

/**
 * Gets an alias by name
 * @param name - Alias name
 * @returns Stellar account address or undefined if not found
 */
export function getAlias(name: string): string | undefined {
  const config = readConfig();
  return config.aliases?.[name];
}

/**
 * Gets all aliases
 * @returns Record of alias names to addresses
 */
export function getAllAliases(): Record<string, string> {
  const config = readConfig();
  return config.aliases || {};
}

/**
 * Removes an alias
 * @param name - Alias name
 * @param location - Optional config file location
 */
export function removeAlias(name: string, location?: string): void {
  const config = readConfig();
  if (config.aliases) {
    delete config.aliases[name];
    writeConfig(config, location);
  }
}
