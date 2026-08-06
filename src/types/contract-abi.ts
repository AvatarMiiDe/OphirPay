/**
 * Contract ABI type definitions for OphirPay Soroban contracts v3.
 * Matches the contracts/ophirpay/src/lib.rs and contracts/emitter/src/lib.rs interfaces.
 *
 * Key features:
 * - Escrow: lock funds with deadline, owner release, beneficiary claim
 * - Payment Streaming: linear vesting with overflow-protected math
 * - Batch Payments: atomic multi-recipient recording with queryability
 * - SAC Token Support: works with any Stellar Asset Contract
 * - Native Soroban Events: env.events().publish()
 * - Emergency pause/unpause circuit breaker
 * - Contract upgrade mechanism
 * - Auth-gated emitter contract
 */

/** Supported Stellar asset types */
export type AssetType = "native" | "credit_alphanum4" | "credit_alphanum12";

// ── Payment Record ──────────────────────────────────────────

export interface OnChainPayment {
  id: number;
  payer: string;
  payee: string;
  amount: bigint;
  asset: string;
  tx_hash: string;
  timestamp: number;
  metadata: string;
  cancelled: boolean;
}

// ── Escrow ──────────────────────────────────────────────────

export interface EscrowData {
  id: number;
  depositor: string;
  beneficiary: string;
  amount: bigint;
  asset: string;
  deadline: number;
  released: boolean;
  claimed: boolean;
  metadata: string;
}

// ── Payment Stream ──────────────────────────────────────────

export interface StreamData {
  id: number;
  creator: string;
  recipient: string;
  total_amount: bigint;
  claimed_amount: bigint;
  asset: string;
  start_time: number;
  end_time: number;
  cancelled: boolean;
  metadata: string;
}

// ── Batch ───────────────────────────────────────────────────

export interface BatchData {
  id: number;
  creator: string;
  total_recipients: number;
  total_amount: bigint;
  asset: string;
  timestamp: number;
  tx_hash: string;
  payment_ids: number[];
}

// ── Payment Event (Emitter Contract) ────────────────────────

export interface PaymentEvent {
  id: number;
  source: string;
  payer: string;
  payee: string;
  amount: bigint;
  tx_hash: string;
  timestamp: number;
}

// ── Contract Errors ─────────────────────────────────────────

export enum PaymentErrorCode {
  NotInitialized = 1,
  AlreadyInitialized = 2,
  PaymentNotFound = 3,
  Unauthorized = 4,
  InvalidAmount = 5,
  EscrowNotDue = 6,
  EscrowAlreadyReleased = 7,
  EscrowNotFound = 8,
  StreamNotStarted = 9,
  StreamAlreadyCancelled = 10,
  StreamNotFound = 11,
  StreamFullyClaimed = 12,
  BatchTooLarge = 13,
  BatchEmpty = 14,
  TokenTransferFailed = 15,
  InsufficientBalance = 16,
  PaymentAlreadyCancelled = 17,
  ContractPaused = 18,
}

export const PAYMENT_ERROR_MESSAGES: Record<number, string> = {
  1: "Contract not initialized",
  2: "Contract already initialized",
  3: "Payment record not found",
  4: "Unauthorized caller",
  5: "Invalid payment amount",
  6: "Escrow not yet due for claiming",
  7: "Escrow already released",
  8: "Escrow not found",
  9: "Payment stream has not started yet",
  10: "Payment stream is already cancelled",
  11: "Payment stream not found",
  12: "All tokens already claimed from stream",
  13: "Batch exceeds maximum of 100 recipients",
  14: "Batch is empty",
  15: "Token transfer failed",
  16: "Insufficient balance",
  17: "Payment already cancelled",
  18: "Contract is paused — all writes are blocked",
};
