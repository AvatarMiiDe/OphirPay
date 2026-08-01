import {
  rpc,
  Contract,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { getSorobanServer, NETWORK_PASSPHRASE } from "@/lib/stellar";

// ── Contract Configuration ─────────────────────────────────────

export const DEFAULT_CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ||
  "CDLZFC3SYJYDZT7K67VZ75WJDSVIE52RKKQ7YNJCK6VNVNFBS44ABTBS";

// ── 3 Error Types ──────────────────────────────────────────────

export enum ContractErrorType {
  /** Network connectivity issues (RPC down, timeout, DNS failure) */
  NETWORK = "NETWORK",
  /** Contract execution errors (HostError, SCError, panic, bad args) */
  CONTRACT = "CONTRACT",
  /** User declined the Freighter signature prompt */
  USER_REJECTION = "USER_REJECTION",
}

export class ContractError extends Error {
  type: ContractErrorType;
  constructor(message: string, type: ContractErrorType) {
    super(message);
    this.name = "ContractError";
    this.type = type;
  }
}

/** Classify any thrown error into one of three contract error types */
export function classifyContractError(err: unknown): ContractError {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("declined") ||
    msg.includes("rejected") ||
    msg.includes("denied")
  ) {
    return new ContractError(
      "User rejected the transaction in Freighter wallet.",
      ContractErrorType.USER_REJECTION
    );
  }
  if (
    msg.includes("HostError") ||
    msg.includes("ContractError") ||
    msg.includes("panic") ||
    msg.includes("SCError")
  ) {
    return new ContractError(
      `Smart contract execution failed: ${msg}`,
      ContractErrorType.CONTRACT
    );
  }
  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("timeout") ||
    msg.includes("ECONNREFUSED")
  ) {
    return new ContractError(
      `Network error connecting to Soroban RPC: ${msg}`,
      ContractErrorType.NETWORK
    );
  }
  return new ContractError(msg, ContractErrorType.CONTRACT);
}

// ── Result Types ───────────────────────────────────────────────

export interface SimulateResult {
  status: "SIMULATED" | "SIMULATION_FAILED";
  returnValue: unknown;
  error?: string;
}

export interface InvokeResult {
  status: "AWAITING_SIGNATURE" | "SUBMITTED";
  txHash: string;
  xdr?: string;
}

// ── Simulate (Read-Only) ──────────────────────────────────────

/**
 * Simulate a contract function call without submitting a transaction.
 * No wallet signature required.
 */
export async function simulateContractCall(
  contractId: string,
  functionName: string,
  sourcePublicKey: string
): Promise<SimulateResult> {
  const server = getSorobanServer();

  try {
    const contract = new Contract(contractId);
    const account = await server.getAccount(sourcePublicKey);

    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
      timebounds: { minTime: 0, maxTime: 0 },
    })
      .addOperation(contract.call(functionName))
      .build();

    const simResponse = await server.simulateTransaction(tx);

    if ("error" in simResponse && simResponse.error) {
      return {
        status: "SIMULATION_FAILED",
        returnValue: null,
        error: String(simResponse.error),
      };
    }

    let returnValue: unknown = null;
    if ("result" in simResponse && simResponse.result) {
      try {
        returnValue = scValToNative(simResponse.result.retval);
      } catch {
        returnValue = "(binary result)";
      }
    }

    return { status: "SIMULATED", returnValue };
  } catch (err) {
    throw classifyContractError(err);
  }
}

// ── Invoke (with signature) ───────────────────────────────────

/**
 * Build a contract invocation transaction and return XDR for Freighter signing.
 * The caller must sign the returned XDR via Freighter, then call submitContractInvocation().
 */
export async function invokeContractFunction(
  contractId: string,
  functionName: string,
  sourcePublicKey: string
): Promise<InvokeResult> {
  const server = getSorobanServer();

  try {
    const contract = new Contract(contractId);
    const account = await server.getAccount(sourcePublicKey);

    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
      timebounds: {
        minTime: 0,
        maxTime: Math.floor(Date.now() / 1000) + 300,
      },
    })
      .addOperation(contract.call(functionName))
      .build();

    const prepared = await server.prepareTransaction(tx);

    return {
      status: "AWAITING_SIGNATURE",
      txHash: "",
      xdr: prepared.toXDR(),
    };
  } catch (err) {
    throw classifyContractError(err);
  }
}

// ── Submit ─────────────────────────────────────────────────────

/**
 * Submit a Freighter-signed contract invocation XDR to the Soroban RPC.
 * Polls for result and returns the transaction status.
 */
export async function submitContractInvocation(signedXdr: string): Promise<{
  txHash: string;
  status: string;
}> {
  const server = getSorobanServer();

  try {
    const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const sendResponse = await server.sendTransaction(tx);
    const txHash = sendResponse.hash;

    let result = await server.getTransaction(txHash);
    let attempts = 0;
    while (result.status === "NOT_FOUND" && attempts < 30) {
      await new Promise((r) => setTimeout(r, 1000));
      result = await server.getTransaction(txHash);
      attempts++;
    }

    return { txHash, status: result.status };
  } catch (err) {
    throw classifyContractError(err);
  }
}
