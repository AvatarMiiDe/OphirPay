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
  classifyContractError,
  type InvokeResult,
} from "@/lib/contracts";
import { getFreighter } from "@/hooks/useFreighter";

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
  return signAndSubmit(caller, DEFAULT_CONTRACT_ID, "set_multisig_config", args);
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
  return signAndSubmit(caller, DEFAULT_CONTRACT_ID, "propose_payment", args);
}

export async function approveMultisigPayment(
  signer: string,
  requestId: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(signer, { type: "address" }),
    nativeToScVal(requestId, { type: "u64" }),
  ];
  return signAndSubmit(signer, DEFAULT_CONTRACT_ID, "approve_payment", args);
}

export async function executeApprovedPayment(
  caller: string,
  requestId: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(requestId, { type: "u64" }),
  ];
  return signAndSubmit(caller, DEFAULT_CONTRACT_ID, "execute_approved_payment", args);
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
  return signAndSubmit(proposer, DEFAULT_CONTRACT_ID, "create_proposal", args);
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
  return signAndSubmit(voter, DEFAULT_CONTRACT_ID, "vote_on_proposal", args);
}

export async function executeGovernanceProposal(
  proposalId: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(proposalId, { type: "u64" }),
  ];
  return signAndSubmit(
    "",
    DEFAULT_CONTRACT_ID,
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
  return signAndSubmit(creator, DEFAULT_CONTRACT_ID, "create_recurring", args);
}

export async function cancelRecurringPayment(
  caller: string,
  recurringId: number,
): Promise<ContractCallResult> {
  const args: xdr.ScVal[] = [
    nativeToScVal(caller, { type: "address" }),
    nativeToScVal(recurringId, { type: "u64" }),
  ];
  return signAndSubmit(caller, DEFAULT_CONTRACT_ID, "cancel_recurring", args);
}

// ── Utility: Read-Only Simulation Helpers ──────────────────────

/**
 * Simulate reading contract stats (read-only, no wallet needed).
 */
export async function readContractStats(sourcePublicKey: string) {
  return simulateContractCall(DEFAULT_CONTRACT_ID, "get_stats", sourcePublicKey);
}

/**
 * Simulate reading audit log count.
 */
export async function readAuditLogCount(sourcePublicKey: string) {
  return simulateContractCall(DEFAULT_CONTRACT_ID, "get_audit_log_count", sourcePublicKey);
}
