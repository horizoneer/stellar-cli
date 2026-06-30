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
}

const CONFIG_FILE_NAME = '.stellarrc';

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
    return JSON.parse(content) as StellarConfig;
  } catch {
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
