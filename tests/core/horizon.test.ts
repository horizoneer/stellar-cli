/**
 * Tests for Horizon API integration
 */

import { fetchTransaction, fetchOperations, isTransactionHash, isAccountId, HORIZON_URLS, Network } from '../../src/core/horizon';
import { HorizonError } from '../../src/utils/errors';

// Mock axios to avoid actual API calls
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
  })),
  isAxiosError: jest.fn(() => true),
}));

describe('Horizon API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isTransactionHash', () => {
    it('should validate correct transaction hash', () => {
      const validHash = 'a'.repeat(64);
      expect(isTransactionHash(validHash)).toBe(true);
    });

    it('should reject invalid transaction hash - too short', () => {
      expect(isTransactionHash('abc123')).toBe(false);
    });

    it('should reject invalid transaction hash - non-hex', () => {
      expect(isTransactionHash('z'.repeat(64))).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isTransactionHash('')).toBe(false);
    });
  });

  describe('isAccountId', () => {
    it('should validate correct account ID', () => {
      const validAccount = 'GABCDEF' + 'A'.repeat(49);
      expect(isAccountId(validAccount)).toBe(true);
    });

    it('should reject invalid account ID - wrong prefix', () => {
      expect(isAccountId('A' + 'B'.repeat(55))).toBe(false);
    });

    it('should reject invalid account ID - wrong length', () => {
      expect(isAccountId('G' + 'A'.repeat(54))).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isAccountId('')).toBe(false);
    });
  });

  describe('HORIZON_URLS', () => {
    it('should have mainnet URL', () => {
      expect(HORIZON_URLS.mainnet).toBe('https://horizon.stellar.org');
    });

    it('should have testnet URL', () => {
      expect(HORIZON_URLS.testnet).toBe('https://horizon-testnet.stellar.org');
    });

    it('should respect environment variables', () => {
      process.env.HORIZON_MAINNET_URL = 'https://custom.mainnet.com';
      // Re-import to test environment variable
      jest.resetModules();
      const { HORIZON_URLS: NewUrls } = require('../src/core/horizon');
      expect(NewUrls.mainnet).toBe('https://custom.mainnet.com');
      delete process.env.HORIZON_MAINNET_URL;
    });
  });
});
