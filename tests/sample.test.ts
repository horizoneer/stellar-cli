/**
 * Sample test file for stellar-inspector-cli
 * Tests basic functionality and type definitions
 */

import { isTransactionHash } from '../src/core/horizon';
import { decodeTransaction } from '../src/core/decoder';
import { Transaction } from '../src/types';

describe('stellar-inspector-cli', () => {
  describe('isTransactionHash', () => {
    it('should return true for valid 64-character hex strings', () => {
      const validHash = 'a'.repeat(64);
      expect(isTransactionHash(validHash)).toBe(true);
    });

    it('should return true for uppercase hex strings', () => {
      const validHash = 'A'.repeat(64);
      expect(isTransactionHash(validHash)).toBe(true);
    });

    it('should return true for mixed case hex strings', () => {
      const validHash = 'aBcDeF'.repeat(10) + 'aBcD'; // 64 chars
      expect(isTransactionHash(validHash)).toBe(true);
    });

    it('should return false for strings shorter than 64 characters', () => {
      const shortHash = 'abc123';
      expect(isTransactionHash(shortHash)).toBe(false);
    });

    it('should return false for strings longer than 64 characters', () => {
      const longHash = 'a'.repeat(65);
      expect(isTransactionHash(longHash)).toBe(false);
    });

    it('should return false for non-hex characters', () => {
      const invalidHash = 'g'.repeat(64);
      expect(isTransactionHash(invalidHash)).toBe(false);
    });
  });

  describe('decodeTransaction', () => {
    it('should decode a transaction correctly', () => {
      const mockTx: Transaction = {
        id: '123456789',
        hash: 'a'.repeat(64),
        ledger: 12345678,
        created_at: '2024-01-01T00:00:00Z',
        source_account: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        source_account_sequence: '1234567890',
        fee_paid: 100000,
        operation_count: 1,
        envelope_xdr: 'AAAAAA==',
        result_xdr: 'AAAAAA==',
        result_meta_xdr: 'AAAAAA==',
        memo_type: 'none',
        signatures: ['sig1'],
        successful: true,
      };

      const decoded = decodeTransaction(mockTx);

      expect(decoded.hash).toBe(mockTx.hash);
      expect(decoded.sourceAccount).toBe(mockTx.source_account);
      expect(decoded.status).toBe('success');
      expect(decoded.fee).toContain('XLM');
    });

    it('should handle memo correctly', () => {
      const mockTx: Transaction = {
        id: '123456789',
        hash: 'a'.repeat(64),
        ledger: 12345678,
        created_at: '2024-01-01T00:00:00Z',
        source_account: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        source_account_sequence: '1234567890',
        fee_paid: 100000,
        operation_count: 1,
        envelope_xdr: 'AAAAAA==',
        result_xdr: 'AAAAAA==',
        result_meta_xdr: 'AAAAAA==',
        memo_type: 'text',
        memo: 'Hello Stellar!',
        signatures: ['sig1'],
        successful: true,
      };

      const decoded = decodeTransaction(mockTx);

      expect(decoded.memo).toBe('Hello Stellar!');
    });
  });
});
