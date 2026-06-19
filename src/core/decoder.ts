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
      return decodeChangeTrust(op);
    case 'allow_trust':
      return decodeAllowTrust(op);
    case 'account_merge':
      return decodeAccountMerge(op);
    case 'manage_buy_offer':
      return decodeManageBuyOffer(op);
    case 'manage_sell_offer':
      return decodeManageSellOffer(op);
    case 'create_passive_sell_offer':
    case 'create_passive_buy_offer':
      return decodePassiveOffer(op);
    case 'manage_data':
      return decodeManageData(op);
    case 'set_options':
      return decodeSetOptions(op);
    case 'path_payment_strict_receive':
    case 'path_payment_strict_send':
      return decodePathPayment(op);
    case 'begin_sponsoring_future_reserves':
      return decodeBeginSponsoring(op);
    case 'end_sponsoring_future_reserves':
      return decodeEndSponsoring(op);
    case 'revoke_sponsorship':
      return decodeRevokeSponsorship(op);
    case 'clawback':
      return decodeClawback(op);
    case 'clawback_claimable_balance':
      return decodeClawbackClaimableBalance(op);
    case 'set_trust_line_flags':
      return decodeSetTrustLineFlags(op);
    case 'liquidity_pool_deposit':
      return decodeLiquidityPoolDeposit(op);
    case 'liquidity_pool_withdraw':
      return decodeLiquidityPoolWithdraw(op);
    case 'invoke_host_function':
      return decodeInvokeHostFunction(op);
    case 'extend_footprint_ttl':
      return decodeExtendFootprintTtl(op);
    case 'restore_footprint':
      return decodeRestoreFootprint(op);
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
 * Decodes a change_trust operation
 */
function decodeChangeTrust(op: Operation): DecodedOperation {
  const asset = op.asset_type === 'native' 
    ? 'XLM' 
    : `${op.asset_code}:${(op.asset_issuer as string)?.slice(0, 8)}...`;
  const limit = op.limit as string;
  const trustor = op.source_account || op.trustor as string;

  return {
    type: 'Change Trust',
    description: limit === '0' ? `Delete trustline for ${asset}` : `Add/modify trustline for ${asset}`,
    details: {
      'Trustor': trustor,
      'Asset': asset,
      'Limit': limit === '0' ? 'Delete' : limit,
    },
  };
}

/**
 * Decodes an allow_trust operation
 */
function decodeAllowTrust(op: Operation): DecodedOperation {
  const trustor = op.trustor as string;
  const assetCode = op.asset_code as string;
  const authorize = op.authorize as number;

  return {
    type: 'Allow Trust',
    description: authorize ? `Authorize trustline for ${assetCode}` : `Revoke trustline for ${assetCode}`,
    details: {
      'Trustor': trustor,
      'Asset Code': assetCode,
      'Authorized': authorize ? 'Yes' : 'No',
    },
  };
}

/**
 * Decodes an account_merge operation
 */
function decodeAccountMerge(op: Operation): DecodedOperation {
  const account = op.source_account as string;
  const destination = op.into as string;

  return {
    type: 'Account Merge',
    description: `Merge account into destination`,
    details: {
      'Account': account,
      'Destination': destination,
    },
  };
}

/**
 * Decodes a manage_buy_offer operation
 */
function decodeManageBuyOffer(op: Operation): DecodedOperation {
  const buying = op.buying_asset_type === 'native' ? 'XLM' : `${op.buying_asset_code}`;
  const selling = op.selling_asset_type === 'native' ? 'XLM' : `${op.selling_asset_code}`;
  const amount = op.amount as string;
  const price = op.price as string;
  const offerId = op.offer_id as number;

  return {
    type: 'Manage Buy Offer',
    description: offerId === 0 ? `Create buy offer: ${buying}` : `Modify/delete buy offer #${offerId}`,
    details: {
      'Offer ID': offerId,
      'Buying': buying,
      'Selling': selling,
      'Amount': amount,
      'Price': price,
    },
  };
}

/**
 * Decodes a manage_sell_offer operation
 */
function decodeManageSellOffer(op: Operation): DecodedOperation {
  const buying = op.buying_asset_type === 'native' ? 'XLM' : `${op.buying_asset_code}`;
  const selling = op.selling_asset_type === 'native' ? 'XLM' : `${op.selling_asset_code}`;
  const amount = op.amount as string;
  const price = op.price as string;
  const offerId = op.offer_id as number;

  return {
    type: 'Manage Sell Offer',
    description: offerId === 0 ? `Create sell offer: ${selling}` : `Modify/delete sell offer #${offerId}`,
    details: {
      'Offer ID': offerId,
      'Buying': buying,
      'Selling': selling,
      'Amount': amount,
      'Price': price,
    },
  };
}

/**
 * Decodes a passive offer operation
 */
function decodePassiveOffer(op: Operation): DecodedOperation {
  const buying = op.buying_asset_type === 'native' ? 'XLM' : `${op.buying_asset_code}`;
  const selling = op.selling_asset_type === 'native' ? 'XLM' : `${op.selling_asset_code}`;
  const amount = op.amount as string;
  const price = op.price as string;

  return {
    type: 'Create Passive Offer',
    description: `Create passive offer: ${selling} → ${buying}`,
    details: {
      'Buying': buying,
      'Selling': selling,
      'Amount': amount,
      'Price': price,
    },
  };
}

/**
 * Decodes a manage_data operation
 */
function decodeManageData(op: Operation): DecodedOperation {
  const dataKey = op.data_key as string;
  const dataValue = op.data_value ? Buffer.from(op.data_value as string, 'base64').toString() : '(deleted)';

  return {
    type: 'Manage Data',
    description: dataValue === '(deleted)' ? `Delete data key: ${dataKey}` : `Set data key: ${dataKey}`,
    details: {
      'Key': dataKey,
      'Value': dataValue,
    },
  };
}

/**
 * Decodes a set_options operation
 */
function decodeSetOptions(op: Operation): DecodedOperation {
  const details: Record<string, string | number> = {};

  if (op.signer) {
    const signer = op.signer as { key: string; weight: number };
    details['Signer'] = signer.key;
    details['Signer Weight'] = signer.weight;
  }

  if (op.low_threshold !== undefined) {
    details['Low Threshold'] = op.low_threshold as number;
  }
  if (op.med_threshold !== undefined) {
    details['Med Threshold'] = op.med_threshold as number;
  }
  if (op.high_threshold !== undefined) {
    details['High Threshold'] = op.high_threshold as number;
  }

  if (op.inflation_destination) {
    details['Inflation Dest'] = op.inflation_destination as string;
  }

  if (op.home_domain) {
    details['Home Domain'] = op.home_domain as string;
  }

  // Flags
  const flags: string[] = [];
  if (op.set_flags) {
    const setFlags = op.set_flags as number[];
    if (setFlags.includes(1)) flags.push('AuthRequired');
    if (setFlags.includes(2)) flags.push('AuthRevocable');
    if (setFlags.includes(4)) flags.push('AuthImmutable');
    if (setFlags.includes(8)) flags.push('AuthClawback');
  }
  if (flags.length > 0) {
    details['Set Flags'] = flags.join(', ');
  }

  const clearFlags: string[] = [];
  if (op.clear_flags) {
    const cf = op.clear_flags as number[];
    if (cf.includes(1)) clearFlags.push('AuthRequired');
    if (cf.includes(2)) clearFlags.push('AuthRevocable');
    if (cf.includes(4)) clearFlags.push('AuthImmutable');
    if (cf.includes(8)) clearFlags.push('AuthClawback');
  }
  if (clearFlags.length > 0) {
    details['Clear Flags'] = clearFlags.join(', ');
  }

  return {
    type: 'Set Options',
    description: Object.keys(details).length > 0 ? 'Update account options' : 'No changes specified',
    details,
  };
}

/**
 * Decodes a path_payment operation
 */
function decodePathPayment(op: Operation): DecodedOperation {
  const from = op.from as string;
  const to = op.to as string;
  const sourceAsset = op.source_asset_type === 'native' ? 'XLM' : op.source_asset_code as string;
  const destAsset = op.asset_type === 'native' ? 'XLM' : op.asset_code as string;
  const sourceAmount = op.source_amount as string;
  const destAmount = op.amount as string;

  const pathLength = (op.path as unknown[])?.length || 0;

  return {
    type: op.type === 'path_payment_strict_receive' ? 'Path Payment (Strict Receive)' : 'Path Payment (Strict Send)',
    description: `Path payment: ${sourceAsset} → ${destAsset}`,
    details: {
      'From': from,
      'To': to,
      'Source Asset': sourceAsset,
      'Source Amount': sourceAmount,
      'Dest Asset': destAsset,
      'Dest Amount': destAmount,
      'Path Length': pathLength,
    },
  };
}

/**
 * Decodes a begin_sponsoring_future_reserves operation
 */
function decodeBeginSponsoring(op: Operation): DecodedOperation {
  return {
    type: 'Begin Sponsoring',
    description: 'Begin sponsoring future reserves',
    details: {
      'Sponsored ID': op.sponsored_id as string,
    },
  };
}

/**
 * Decodes an end_sponsoring_future_reserves operation
 */
function decodeEndSponsoring(op: Operation): DecodedOperation {
  return {
    type: 'End Sponsoring',
    description: 'End sponsoring future reserves',
    details: {
      'Begin Sponsor': op.begin_sponsor as string,
    },
  };
}

/**
 * Decodes a revoke_sponsorship operation
 */
function decodeRevokeSponsorship(op: Operation): DecodedOperation {
  return {
    type: 'Revoke Sponsorship',
    description: 'Revoke sponsorship of an account entry',
    details: {
      'Account ID': op.account_id as string,
    },
  };
}

/**
 * Decodes a clawback operation
 */
function decodeClawback(op: Operation): DecodedOperation {
  const asset = op.asset_type === 'native' ? 'XLM' : `${op.asset_code}`;
  
  return {
    type: 'Clawback',
    description: `Clawback ${asset} from account`,
    details: {
      'Asset': asset,
      'From': op.from as string,
      'Amount': op.amount as string,
    },
  };
}

/**
 * Decodes a clawback_claimable_balance operation
 */
function decodeClawbackClaimableBalance(op: Operation): DecodedOperation {
  return {
    type: 'Clawback Claimable Balance',
    description: 'Clawback a claimable balance',
    details: {
      'Balance ID': op.balance_id as string,
    },
  };
}

/**
 * Decodes a set_trust_line_flags operation
 */
function decodeSetTrustLineFlags(op: Operation): DecodedOperation {
  const asset = `${op.asset_code}:${(op.asset_issuer as string)?.slice(0, 8)}...`;
  const trustor = op.trustor as string;

  const flags: string[] = [];
  if (op.set_flags) {
    const sf = op.set_flags as { authorized?: boolean; authorized_to_maintain_liabilities?: boolean; clawback_enabled?: boolean };
    if (sf.authorized) flags.push('Authorized');
    if (sf.authorized_to_maintain_liabilities) flags.push('Maintain Liabilities');
    if (sf.clawback_enabled) flags.push('Clawback');
  }

  return {
    type: 'Set Trustline Flags',
    description: `Modify trustline flags for ${asset}`,
    details: {
      'Trustor': trustor,
      'Asset': asset,
      'Flags': flags.length > 0 ? flags.join(', ') : 'None',
    },
  };
}

/**
 * Decodes a liquidity_pool_deposit operation
 */
function decodeLiquidityPoolDeposit(op: Operation): DecodedOperation {
  return {
    type: 'Liquidity Pool Deposit',
    description: 'Deposit assets into liquidity pool',
    details: {
      'Pool ID': op.liquidity_pool_id as string,
      'Max Amount A': op.max_amount_a as string,
      'Max Amount B': op.max_amount_b as string,
      'Min Price': op.min_price as string,
      'Max Price': op.max_price as string,
    },
  };
}

/**
 * Decodes a liquidity_pool_withdraw operation
 */
function decodeLiquidityPoolWithdraw(op: Operation): DecodedOperation {
  return {
    type: 'Liquidity Pool Withdraw',
    description: 'Withdraw assets from liquidity pool',
    details: {
      'Pool ID': op.liquidity_pool_id as string,
      'Amount': op.amount as string,
      'Min Amount A': op.min_amount_a as string,
      'Min Amount B': op.min_amount_b as string,
    },
  };
}

/**
 * Decodes an invoke_host_function operation (Soroban)
 */
function decodeInvokeHostFunction(op: Operation): DecodedOperation {
  return {
    type: 'Invoke Host Function (Soroban)',
    description: 'Invoke a Soroban smart contract function',
    details: {
      'Function': op.function as string || 'Contract Call',
      'Contract ID': op.contract_id as string || 'N/A',
    },
  };
}

/**
 * Decodes an extend_footprint_ttl operation (Soroban)
 */
function decodeExtendFootprintTtl(op: Operation): DecodedOperation {
  return {
    type: 'Extend Footprint TTL',
    description: 'Extend lifetime of Soroban contract data',
    details: {
      'Extend To': op.extend_to as number,
    },
  };
}

/**
 * Decodes a restore_footprint operation (Soroban)
 */
function decodeRestoreFootprint(op: Operation): DecodedOperation {
  return {
    type: 'Restore Footprint',
    description: 'Restore archived Soroban contract data',
    details: {},
  };
}
