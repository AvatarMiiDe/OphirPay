// SPDX-License-Identifier: MIT

import {
  rpc,
  Networks,
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  Memo,
} from "@stellar/stellar-sdk";

// ── Batch Recipient ───────────────────────────────────────────

export interface BatchRecipientInput {
  address: string;
  amount: string;
  memo?: string;
}

// ── Units ──────────────────────────────────────────────────────

/** Stroops per XLM — Stellar's smallest unit (1 XLM = 10,000,000 stroops). */
export const XLM_STROOPS = 1e7;

// ── Stellar Network Configuration ──────────────────────────────

export const STELLAR_NETWORK: "TESTNET" | "PUBLIC" =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK as "TESTNET" | "PUBLIC") ||
  "TESTNET";

export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
  "https://soroban-testnet.stellar.org:443";

export const HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
  "https://horizon-testnet.stellar.org";

export const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ||
  (STELLAR_NETWORK === "TESTNET" ? Networks.TESTNET : Networks.PUBLIC);

// ── Horizon Server ─────────────────────────────────────────────

let _horizonServer: Horizon.Server | null = null;

export function getHorizonServer(): Horizon.Server {
  if (!_horizonServer) {
    _horizonServer = new Horizon.Server(HORIZON_URL);
  }
  return _horizonServer;
}

// ── Soroban RPC Server (lazy initialized) ──────────────────────

let _sorobanServer: rpc.Server | null = null;

export function getSorobanServer(): rpc.Server {
  if (!_sorobanServer) {
    _sorobanServer = new rpc.Server(SOROBAN_RPC_URL, {
      allowHttp: false,
    });
  }
  return _sorobanServer;
}

// ── Balance Fetching ───────────────────────────────────────────

export async function fetchXlmBalance(publicKey: string): Promise<string> {
  const server = getHorizonServer();
  const account = await server.loadAccount(publicKey);
  const xlmBalance = account.balances.find(
    (b) => b.asset_type === "native"
  );
  return xlmBalance ? xlmBalance.balance : "0";
}

export interface AssetBalance {
  assetCode: string;
  assetIssuer?: string;
  balance: string;
  type: "native" | "credit_alphanum4" | "credit_alphanum12";
}

/**
 * Fetch all balances for an account (native + issued assets).
 * Returns an array of { assetCode, balance, type } objects.
 */
export async function fetchAllBalances(publicKey: string): Promise<AssetBalance[]> {
  const server = getHorizonServer();
  const account = await server.loadAccount(publicKey);

  return account.balances.map((b) => {
    if (b.asset_type === "native") {
      return { assetCode: "XLM", balance: b.balance, type: "native" as const };
    }
    return {
      assetCode: "asset_code" in b ? (b.asset_code as string) : "UNKNOWN",
      assetIssuer: "asset_issuer" in b ? (b.asset_issuer as string) : undefined,
      balance: b.balance,
      type: (b.asset_type === "credit_alphanum12"
        ? "credit_alphanum12"
        : "credit_alphanum4") as "credit_alphanum4" | "credit_alphanum12",
    };
  });
}

/**
 * Fetch balance for a specific non-native asset.
 */
export async function fetchAssetBalance(
  publicKey: string,
  assetCode: string,
  assetIssuer: string,
): Promise<string> {
  const balances = await fetchAllBalances(publicKey);
  const found = balances.find(
    (b) => b.assetCode === assetCode && b.assetIssuer === assetIssuer,
  );
  return found?.balance ?? "0";
}

// ── Types ─────────────────────────────────────────────────────

export interface SubmitResult {
  hash: string;
  successful: boolean;
}

// ── Transaction Building & Submission ──────────────────────────

export interface BuildTxResult {
  xdr: string;
  sourceAccount: Horizon.AccountResponse;
}

/**
 * Build an unsigned payment transaction (XLM or custom asset).
 * Returns the XDR string — the caller must sign it (e.g. via Freighter).
 * The transaction expires after 5 minutes.
 */
export async function buildPaymentTx(params: {
  sourcePublicKey: string;
  destination: string;
  amount: string;
  memo?: string;
  assetCode?: string;
  assetIssuer?: string;
}): Promise<BuildTxResult> {
  const {
    sourcePublicKey,
    destination,
    amount,
    memo,
    assetCode = "XLM",
    assetIssuer,
  } = params;
  const server = getHorizonServer();

  const sourceAccount = await server.loadAccount(sourcePublicKey);

  const now = Math.floor(Date.now() / 1000);

  const paymentAsset =
    assetCode === "XLM" || !assetIssuer
      ? Asset.native()
      : new Asset(assetCode, assetIssuer);

  let builder = new TransactionBuilder(sourceAccount, {
    fee: (await server.fetchBaseFee()).toString(),
    networkPassphrase: NETWORK_PASSPHRASE,
    timebounds: {
      minTime: 0,
      maxTime: now + 300, // 5 minutes from now
    },
  }).addOperation(
    Operation.payment({
      destination,
      asset: paymentAsset,
      amount,
    })
  );

  if (memo) {
    builder = builder.addMemo(Memo.text(memo));
  }

  const tx = builder.build();
  return { xdr: tx.toXDR(), sourceAccount };
}

/**
 * Build a batch payment transaction with multiple operations.
 * All payments go into a single Stellar transaction (up to 100 ops).
 */
export async function buildBatchPaymentTx(params: {
  sourcePublicKey: string;
  recipients: BatchRecipientInput[];
}): Promise<BuildTxResult> {
  const { sourcePublicKey, recipients } = params;
  const server = getHorizonServer();

  const sourceAccount = await server.loadAccount(sourcePublicKey);

  const now = Math.floor(Date.now() / 1000);
  const baseFee = (await server.fetchBaseFee()).toString();

  let builder = new TransactionBuilder(sourceAccount, {
    fee: baseFee,
    networkPassphrase: NETWORK_PASSPHRASE,
    timebounds: {
      minTime: 0,
      maxTime: now + 300, // 5 minutes
    },
  });

  for (const recipient of recipients) {
    builder = builder.addOperation(
      Operation.payment({
        destination: recipient.address,
        asset: Asset.native(),
        amount: recipient.amount,
      })
    );
  }

  const tx = builder.build();
  return { xdr: tx.toXDR(), sourceAccount };
}

/**
 * Submit a signed XDR transaction to Horizon.
 */
export async function submitSignedTx(
  signedXdr: string
): Promise<SubmitResult> {
  const server = getHorizonServer();
  const transaction = TransactionBuilder.fromXDR(
    signedXdr,
    NETWORK_PASSPHRASE
  );
  return server.submitTransaction(transaction);
}

// ── Helpers ────────────────────────────────────────────────────

export function getStellarExplorerUrl(txHash: string): string {
  const base =
    STELLAR_NETWORK === "TESTNET"
      ? "https://stellar.expert/explorer/testnet"
      : "https://stellar.expert/explorer/public";
  return `${base}/tx/${txHash}`;
}

export function getAccountExplorerUrl(publicKey: string): string {
  const base =
    STELLAR_NETWORK === "TESTNET"
      ? "https://stellar.expert/explorer/testnet"
      : "https://stellar.expert/explorer/public";
  return `${base}/account/${publicKey}`;
}

export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(address);
}

// ── Memo Validation ─────────────────────────────────────────

/** Maximum memo size in bytes (Stellar protocol limit). */
export const MEMO_MAX_BYTES = 28;

/** Allowed Stellar memo types. */
export type StellarMemoType = "text" | "id" | "hash" | "return";

export interface MemoValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a Stellar memo before building a transaction.
 *
 * Stellar memos are limited to 28 bytes. The current implementation
 * only supports text memos (Memo.text()). Multi-byte UTF-8 characters
 * (e.g. é, ñ, emojis) consume more than 1 byte each, so we must check
 * the actual byte length rather than the string character count.
 *
 * @param memo - The memo string to validate (optional)
 * @returns MemoValidationResult with valid flag and optional error message
 */
export function validateMemo(memo?: string): MemoValidationResult {
  if (!memo || memo.trim() === "") {
    return { valid: true };
  }

  const trimmed = memo.trim();
  const byteLength = new TextEncoder().encode(trimmed).byteLength;

  if (byteLength > MEMO_MAX_BYTES) {
    return {
      valid: false,
      error: `Memo exceeds the ${MEMO_MAX_BYTES}-byte limit (${byteLength} bytes). ` +
        "Use shorter text or remove multi-byte characters (emojis, accented letters).",
    };
  }

  return { valid: true };
}

/**
 * Map a Horizon or contract error message to a user-friendly memo error.
 * Returns null if the error is not memo-related.
 */
export function getMemoErrorMessage(error: string): string | null {
  const lower = error.toLowerCase();

  if (lower.includes("memo") && (lower.includes("too long") || lower.includes("exceeds"))) {
    return "Memo is too long. Stellar memos are limited to 28 bytes.";
  }
  if (lower.includes("memo") && lower.includes("invalid")) {
    return "Invalid memo format. Use plain text, numbers, or hex.";
  }
  if (lower.includes("tx_bad") && lower.includes("memo")) {
    return "Transaction rejected due to an invalid memo. Check the memo format and try again.";
  }
  if (lower.includes("op_bad") && lower.includes("memo")) {
    return "Operation failed: memo format is invalid for this transaction type.";
  }

  return null;
}
