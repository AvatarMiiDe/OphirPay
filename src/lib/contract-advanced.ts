/**
 * Advanced contract interaction helpers for multisig, governance,
 * recurring payments, and audit log queries.
 * 
 * These wire the Soroban OphirPayContract directly through Freighter signing
 * instead of API route stubs.
 */

import {
  nativeToScVal,
  type xdr,
} from "@stellar/stellar-sdk";
import {
  invokeContractFunction,
  submitContractInvocation,
  simulateContractCall,
  DEFAULT_CONTRACT_ID,
  EMITTER_CONTRACT_ID,
  classifyContractError,
  type InvokeResult,
} from "@/lib/contracts";
import { getFreighter } from "@/hooks/useFreighter";

/** Resolve contract ID from env var or fallback to default */
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || DEFAULT_CONTRACT_ID;
const EMITTER_ID = process.env.NEXT_PUBLIC_EMITTER_CONTRACT_ID || EMITTER_CONTRACT_ID;

// ── Types ──────────────────────────────────────────────────────

export interface ContractCallResult {
  success: boolean;
  txHash?: string;
  data?: unknown;
  error?: string;
}

// ── Signing Helper ─────────────────────────────────────────────

async function signAndSubmit(
  sourcePublicKey: string,
  contractId: string,
  functionName: string,
  args: xdr.ScVal[] = [],
): Promise<ContractCallResult> {
  const freighter = getFreighter();
  if (!freighter) {
    return { success: false, error: "Freighter wallet not available" };
  }

  try {
    const txInfo = await invokeContractFunction(
      contractId,
      functionName,
      sourcePublicKey,
      args,
    );

    if (txInfo.status !== "AWAITING_SIGNATURE" || !txInfo.xdr) {
      return { success: false, error: "Failed to build transaction" };
    }

    const signedXdr = await freighter.signTransaction(txInfo.xdr, {
      network: "TESTNET",
      networkPassphrase: undefined,
    });

    const result = await submitContractInvocation(signedXdr);
    return {
      success: result.status === "SUCCESS",
      txHash: result.txHash,
      data: result,
    };
  } catch (err) {
    const ce = classifyContractError(err);
    return { success: false, error: ce.message };
  }
}

// ── Multisig Functions ─────────────────────────────────────────

export async function setMultisigConfig(
  caller: string,
  threshold: number,
  signers: string[],
  enabled: boolean,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(threshold, { type: "u32" }),
    nativeToScVal(signers, { type: "vec" }),
    nativeToScVal(enabled, { type: "bool" }),
  ];
  return signAndSubmit(caller, CONTRACT_ID, "set_multisig_config", args);
}

export async function proposeMultisigPayment(
  caller: string,
  payee: string,
  amount: number,
  asset: string,
  txHash: string,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(payee, { type: "address" }),
    nativeToScVal(amount, { type: "i128" }),
    nativeToScVal(asset, { type: "address" }),
    nativeToScVal(txHash, { type: "string" }),
  ];
  return signAndSubmit(caller, CONTRACT_ID, "propose_payment", args);
}

export async function approveMultisigPayment(
  signer: string,
  requestId: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(signer, { type: "address" }),
    nativeToScVal(requestId, { type: "u64" }),
  ];
  return signAndSubmit(signer, CONTRACT_ID, "approve_payment", args);
}

export async function executeApprovedPayment(
  caller: string,
  requestId: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(requestId, { type: "u64" }),
  ];
  return signAndSubmit(caller, CONTRACT_ID, "execute_approved_payment", args);
}

// ── Governance Functions ───────────────────────────────────────

export async function createGovernanceProposal(
  proposer: string,
  title: string,
  description: string,
  actionType: string,
  target: string,
  data: string,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(proposer, { type: "address" }),
    nativeToScVal(title, { type: "string" }),
    nativeToScVal(description, { type: "string" }),
    nativeToScVal(actionType, { type: "string" }),
    nativeToScVal(target, { type: "string" }),
    nativeToScVal(data, { type: "string" }),
  ];
  return signAndSubmit(proposer, CONTRACT_ID, "create_proposal", args);
}

export async function voteOnProposal(
  voter: string,
  proposalId: number,
  support: boolean,
  weight: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(voter, { type: "address" }),
    nativeToScVal(proposalId, { type: "u64" }),
    nativeToScVal(support, { type: "bool" }),
    nativeToScVal(weight, { type: "i128" }),
  ];
  return signAndSubmit(voter, CONTRACT_ID, "vote_on_proposal", args);
}

export async function executeGovernanceProposal(
  proposalId: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(proposalId, { type: "u64" }),
  ];
  return signAndSubmit(
    "",
    CONTRACT_ID,
    "execute_proposal",
    args,
  );
}

// ── Recurring Functions ────────────────────────────────────────

export async function createRecurringPayment(
  creator: string,
  payee: string,
  amount: number,
  asset: string,
  schedule: string, // "Daily" | "Weekly" | "Monthly"
  remaining: number,
  metadata: string,
): Promise<ContractCallResult> {
  const scheduleMap: Record<string, number> = { Daily: 0, Weekly: 1, Monthly: 2 };
  const args: xdr.ScVal[] = [
    nativeToScVal(creator, { type: "address" }),
    nativeToScVal(payee, { type: "address" }),
    nativeToScVal(amount, { type: "i128" }),
    nativeToScVal(asset, { type: "address" }),
    nativeToScVal(scheduleMap[schedule] ?? 0, { type: "u32" }),
    nativeToScVal(remaining, { type: "u32" }),
    nativeToScVal(metadata, { type: "string" }),
  ];
  return signAndSubmit(creator, CONTRACT_ID, "create_recurring", args);
}

export async function cancelRecurringPayment(
  caller: string,
  recurringId: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(recurringId, { type: "u64" }),
  ];
  return signAndSubmit(caller, CONTRACT_ID, "cancel_recurring", args);
}

// ── Utility: Read-Only Simulation Helpers ──────────────────────

/**
 * Simulate reading contract stats (read-only, no wallet needed).
 */
export async function readContractStats(sourcePublicKey: string) {
  return simulateContractCall(CONTRACT_ID, "get_stats", sourcePublicKey);
}

/**
 * Simulate reading audit log count.
 */
export async function readAuditLogCount(sourcePublicKey: string) {
  return simulateContractCall(CONTRACT_ID, "get_audit_log_count", sourcePublicKey);
}

// ── Refund Functions ──────────────────────────────────────────

export async function requestRefund(
  caller: string,
  paymentId: number,
  amount: number,
  asset: string,
  reason: string,
  reasonCode: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(paymentId, { type: "u64" }),
    nativeToScVal(amount, { type: "i128" }),
    nativeToScVal(asset, { type: "address" }),
    nativeToScVal(reason, { type: "string" }),
    nativeToScVal(reasonCode, { type: "u32" }),
  ];
  return signAndSubmit(caller, CONTRACT_ID, "request_refund", args);
}

export async function approveRefund(
  caller: string,
  refundId: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(refundId, { type: "u64" }),
  ];
  return signAndSubmit(caller, CONTRACT_ID, "approve_refund", args);
}

export async function processRefund(
  refundId: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(refundId, { type: "u64" }),
  ];
  return signAndSubmit("", CONTRACT_ID, "process_refund", args);
}

// ── Notification Hook Functions ───────────────────────────────

export async function registerHook(
  subscriber: string,
  eventType: string,
  webhookUrl: string,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(subscriber, { type: "address" }),
    nativeToScVal(eventType, { type: "string" }),
    nativeToScVal(webhookUrl, { type: "string" }),
  ];
  return signAndSubmit(subscriber, CONTRACT_ID, "register_hook", args);
}

export async function unregisterHook(
  caller: string,
  hookId: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(hookId, { type: "u64" }),
  ];
  return signAndSubmit(caller, CONTRACT_ID, "unregister_hook", args);
}
