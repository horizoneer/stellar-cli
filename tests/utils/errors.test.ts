/**
 * Tests for error handling utilities
 */

import { HorizonError, handleError } from '../../src/utils/errors';
import axios from 'axios';

describe('Error Handling', () => {
  describe('HorizonError', () => {
    it('should create HorizonError with required parameters', () => {
      const error = new HorizonError('Not found', 404, 'NOT_FOUND');
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('HorizonError');
    });

    it('should accept optional data parameter', () => {
      const data = { details: 'Additional info' };
      const error = new HorizonError('Error', 500, 'SERVER_ERROR', data);
      expect(error.data).toEqual(data);
    });

    it('should default code to HORIZON_ERROR', () => {
      const error = new HorizonError('Error', 400);
      expect(error.code).toBe('HORIZON_ERROR');
    });
  });

  describe('handleError', () => {
    it('should handle HorizonError 404', () => {
      const error = new HorizonError('Transaction not found', 404, 'NOT_FOUND');
      const result = handleError(error);
      expect(result.message).toBe('Not found: Transaction not found');
      expect(result.data).toBeUndefined();
    });

    it('should handle HorizonError 400', () => {
      const error = new HorizonError('Bad request', 400, 'BAD_REQUEST');
      const result = handleError(error);
      expect(result.message).toBe('Bad request: Bad request');
    });

    it('should handle HorizonError 401', () => {
      const error = new HorizonError('Unauthorized', 401, 'UNAUTHORIZED');
      const result = handleError(error);
      expect(result.message).toBe('Unauthorized: Unauthorized');
    });

    it('should handle HorizonError 429', () => {
      const error = new HorizonError('Rate limited', 429, 'RATE_LIMITED');
      const result = handleError(error);
      expect(result.message).toBe('Rate limited: Please wait before making more requests');
    });

    it('should handle HorizonError 500', () => {
      const error = new HorizonError('Server error', 500, 'SERVER_ERROR');
      const result = handleError(error);
      expect(result.message).toBe('Server error: Horizon is temporarily unavailable');
    });

    it('should handle HorizonError with custom status code', () => {
      const error = new HorizonError('Custom error', 418, 'TEAPOT');
      const result = handleError(error);
      expect(result.message).toBe('Horizon error (418): Custom error');
    });

    it('should handle generic Error with ECONNREFUSED', () => {
      const error = new Error('ECONNREFUSED connection refused');
      const result = handleError(error);
      expect(result.message).toBe('Network error: Unable to connect to Horizon server');
    });

    it('should handle generic Error with ENOTFOUND', () => {
      const error = new Error('ENOTFOUND domain not found');
      const result = handleError(error);
      expect(result.message).toBe('Network error: Unable to connect to Horizon server');
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');
      const result = handleError(error);
      expect(result.message).toBe('Error: Generic error');
    });

    it('should handle unknown error type', () => {
      const error = 'string error';
      const result = handleError(error);
      expect(result.message).toBe('Unknown error occurred');
    });

    it('should include data from HorizonError', () => {
      const data = { field: 'value' };
      const error = new HorizonError('Error', 400, 'BAD_REQUEST', data);
      const result = handleError(error);
      expect(result.data).toEqual(data);
    });
  });
});
