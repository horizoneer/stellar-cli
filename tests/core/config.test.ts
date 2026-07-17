/**
 * Tests for config file handling
 */

import { readConfig, writeConfig, findConfigFile, setAlias, getAlias, getAllAliases, removeAlias, StellarConfig } from '../../src/core/config';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock fs and os
jest.mock('fs');
jest.mock('os');

describe('Config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findConfigFile', () => {
    it('should find config in current directory', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('.stellarrc') && !filePath.includes(os.homedir());
      });
      (process.cwd as jest.Mock).mockReturnValue('/current/dir');
      (os.homedir as jest.Mock).mockReturnValue('/home/user');

      const result = findConfigFile();
      expect(result).toBe(path.join('/current/dir', '.stellarrc'));
    });

    it('should find config in home directory', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes(os.homedir());
      });
      (process.cwd as jest.Mock).mockReturnValue('/current/dir');
      (os.homedir as jest.Mock).mockReturnValue('/home/user');

      const result = findConfigFile();
      expect(result).toBe(path.join('/home/user', '.stellarrc'));
    });

    it('should return null when no config exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (process.cwd as jest.Mock).mockReturnValue('/current/dir');
      (os.homedir as jest.Mock).mockReturnValue('/home/user');

      const result = findConfigFile();
      expect(result).toBeNull();
    });
  });

  describe('readConfig', () => {
    it('should return empty object when no config file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const config = readConfig();
      expect(config).toEqual({});
    });

    it('should parse valid config', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        network: 'mainnet',
        outputFormat: 'json',
        defaultLimit: 10
      }));

      const config = readConfig();
      expect(config.network).toBe('mainnet');
      expect(config.outputFormat).toBe('json');
      expect(config.defaultLimit).toBe(10);
    });

    it('should return empty object for invalid config', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      const config = readConfig();
      expect(config).toEqual({});
    });

    it('should return empty object for invalid network', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        network: 'invalid'
      }));

      const config = readConfig();
      expect(config).toEqual({});
    });
  });

  describe('writeConfig', () => {
    it('should write config to home directory by default', () => {
      (os.homedir as jest.Mock).mockReturnValue('/home/user');
      const config: StellarConfig = { network: 'mainnet' };
      
      writeConfig(config);
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join('/home/user', '.stellarrc'),
        JSON.stringify(config, null, 2)
      );
    });

    it('should write config to custom location', () => {
      const config: StellarConfig = { network: 'testnet' };
      const customPath = '/custom/path/.stellarrc';
      
      writeConfig(config, customPath);
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        customPath,
        JSON.stringify(config, null, 2)
      );
    });
  });

  describe('Alias functions', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({}));
    });

    it('should set alias', () => {
      setAlias('mywallet', 'GABCDEF' + 'A'.repeat(49));
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should get alias', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        aliases: { mywallet: 'GABCDEF' + 'A'.repeat(49) }
      }));
      
      const alias = getAlias('mywallet');
      expect(alias).toBe('GABCDEF' + 'A'.repeat(49));
    });

    it('should return undefined for non-existent alias', () => {
      const alias = getAlias('nonexistent');
      expect(alias).toBeUndefined();
    });

    it('should get all aliases', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        aliases: { wallet1: 'G' + 'A'.repeat(55), wallet2: 'G' + 'B'.repeat(55) }
      }));
      
      const aliases = getAllAliases();
      expect(aliases).toHaveProperty('wallet1');
      expect(aliases).toHaveProperty('wallet2');
    });

    it('should remove alias', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        aliases: { mywallet: 'G' + 'A'.repeat(55) }
      }));
      
      removeAlias('mywallet');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
});
