/**
 * Contract ABI type definitions for OphirPay and Emitter Soroban contracts.
 * Maps the Rust contract interfaces to TypeScript types for client-side usage.
 */

/** Supported Stellar asset types */
export type AssetType = "native" | "credit_alphanum4" | "credit_alphanum12";

/** A payment instruction for batch processing */
export interface ContractPayment {
  destination: string;
  amount: string;
  memo?: string;
}

/** Configuration parameters for a payment stream */
export interface StreamConfig {
  recipient: string;
  amount_per_interval: string;
  interval_seconds: number;
  total_intervals: number;
  asset: string; // contract address of the SAC token
}

/** Event emitted by the Emitter contract on payment */
export interface PaymentEvent {
  payer: string;
  payee: string;
  amount: string;
  timestamp: number;
  memo: string;
}

/** Event emitted by OphirPay on batch completion */
export interface BatchCompletedEvent {
  batch_id: string;
  total_payments: number;
  total_amount: string;
  executed_at: number;
}

/** Event emitted by OphirPay on stream creation */
export interface StreamCreatedEvent {
  stream_id: string;
  creator: string;
  recipient: string;
  amount_per_interval: string;
  interval_seconds: number;
  total_intervals: number;
}

/** Raw contract event with decoded topic and data */
export interface DecodedContractEvent {
  type: string;
  topics: string[];
  data: Record<string, string | number>;
  ledger: number;
  timestamp: number;
  txHash: string;
}
