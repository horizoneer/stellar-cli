/**
 * Network-related type definitions for Stellar Inspector CLI
 */

/**
 * Horizon API health check response
 */
export interface HorizonHealth {
  horizon_version: string;
  core_version: string;
  history_latest_ledger: number;
  history_elder_ledger: number;
  core_latest_ledger: number;
  network_passphrase: string;
  current_protocol_version: number;
  core_supported_protocol_version: number;
  history_latest_ledger_close_time: string;
  core_latest_ledger_close_time: string;
}

/**
 * Network metrics from Horizon
 */
export interface NetworkMetrics {
  accounts_created_24h: number;
  payments_amount_24h: string;
  payments_count_24h: number;
  transactions_created_24h: number;
  operations_created_24h: number;
  ledgers_created_24h: number;
  transaction_fee_charged_24h: string;
  transaction_max_fee_24h: string;
}
