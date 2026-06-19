/**
 * Transaction and operation decoding utilities
 * Transforms raw Horizon API responses into human-readable formats
 */

import { Transaction, Operation } from '../types';

/**
 * Represents a decoded, human-readable transaction
 */
export interface DecodedTransaction {
  hash: string;
  sourceAccount: string;
  fee: string;
  memo: string;
  status: 'success' | 'failed';
  createdAt: string;
}

/**
 * Represents a decoded operation with description and details
 */
export interface DecodedOperation {
  type: string;
  description: string;
  details: Record<string, string | number>;
}

/**
 * Decodes a raw transaction from Horizon API into a human-readable format
 * @param tx - Raw transaction from Horizon
 * @returns Decoded transaction with extracted fields
 */
export function decodeTransaction(tx: Transaction): DecodedTransaction {
  // Format fee in stroops to XLM (1 XLM = 10,000,000 stroops)
  const feeInXlm = (tx.fee_paid / 10_000_000).toFixed(7);

  // Format the timestamp to a readable date
  const createdAt = new Date(tx.created_at).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  // Determine status from result codes
  const status: 'success' | 'failed' = tx.result_xdr ? 'success' : 'failed';

  // Format memo based on type
  let memo = 'None';
  if (tx.memo_type !== 'none' && tx.memo) {
    memo = tx.memo;
  }

  return {
    hash: tx.hash,
    sourceAccount: tx.source_account,
    fee: `${feeInXlm} XLM`,
    memo,
    status,
    createdAt,
  };
}

/**
 * Decodes a single operation into a human-readable format
 * Handles different operation types with specific formatting
 * @param op - Raw operation from Horizon
 * @returns Decoded operation with description and details
 */
export function decodeOperation(op: Operation): DecodedOperation {
  const type = op.type;

  switch (type) {
    case 'payment':
      return decodePayment(op);
    case 'create_account':
      return decodeCreateAccount(op);
    case 'change_trust':
      // TODO: Implement change_trust decoding
      // Should show: trustor, trustee (asset issuer), asset code, limit
      return decodePlaceholder(op, 'Change Trust');
    case 'allow_trust':
      // TODO: Implement allow_trust decoding
      // Should show: trustor, asset code, authorize flag
      return decodePlaceholder(op, 'Allow Trust');
    case 'account_merge':
      // TODO: Implement account_merge decoding
      // Should show: account being merged, destination account
      return decodePlaceholder(op, 'Account Merge');
    case 'manage_buy_offer':
      // TODO: Implement manage_buy_offer decoding
      // Should show: offer ID, buying asset, selling asset, amount, price
      return decodePlaceholder(op, 'Manage Buy Offer');
    case 'manage_sell_offer':
      // TODO: Implement manage_sell_offer decoding
      // Should show: offer ID, buying asset, selling asset, amount, price
      return decodePlaceholder(op, 'Manage Sell Offer');
    case 'manage_data':
      // TODO: Implement manage_data decoding
      // Should show: data key, data value
      return decodePlaceholder(op, 'Manage Data');
    case 'set_options':
      // TODO: Implement set_options decoding
      // Should show: signer, thresholds, flags, inflation destination
      return decodePlaceholder(op, 'Set Options');
    case 'invoke_host_function':
      // TODO: Implement invoke_host_function decoding (Soroban)
      // Should show: function name, arguments, result
      return decodePlaceholder(op, 'Invoke Host Function');
    default:
      return {
        type: type,
        description: 'Unknown operation type',
        details: {},
      };
  }
}

/**
 * Decodes a payment operation
 */
function decodePayment(op: Operation): DecodedOperation {
  const amount = op.amount ? `${op.amount}` : 'N/A';
  const asset = op.asset_type === 'native' ? 'XLM' : `${op.asset_code}:${op.asset_issuer}`;
  const from = op.from as string;
  const to = op.to as string;

  return {
    type: 'Payment',
    description: `Send ${amount} ${asset}`,
    details: {
      'From': from,
      'To': to,
      'Asset': asset,
      'Amount': amount,
    },
  };
}

/**
 * Decodes a create_account operation
 */
function decodeCreateAccount(op: Operation): DecodedOperation {
  const account = op.account as string;
  const startingBalance = op.starting_balance as string;

  return {
    type: 'Create Account',
    description: `Create new account with ${startingBalance} XLM`,
    details: {
      'Account': account,
      'Starting Balance': `${startingBalance} XLM`,
      'Funder': op.source_account || 'Unknown',
    },
  };
}

/**
 * Placeholder decoder for unimplemented operation types
 */
function decodePlaceholder(op: Operation, displayName: string): DecodedOperation {
  return {
    type: displayName,
    description: `(Not yet implemented)`,
    details: {
      'ID': op.id,
      'Transaction': op.transaction_hash,
    },
  };
}
