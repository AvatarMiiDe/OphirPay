// SPDX-License-Identifier: MIT

/**
 * Soroban contract error decoding utilities.
 * Maps raw contract error codes to human-readable messages.
 * Mirrors the PaymentError enum in contracts/ophirpay/src/lib.rs.
 */

const CONTRACT_ERROR_MAP: Record<string, string> = {
  // ── Core Errors (1-10) ───────────────────────────────────
  "1": "Contract not initialized: call init() first",
  "2": "Contract already initialized",
  "3": "Payment not found",
  "4": "Unauthorized: caller does not have permission",
  "5": "Invalid amount: must be greater than zero",
  "6": "Escrow not yet due: deadline has not passed",
  "7": "Escrow already released",
  "8": "Escrow not found",
  "9": "Stream not started: start time is in the future",
  "10": "Stream already cancelled",
  // ── Stream + Batch Errors (11-20) ───────────────────────
  "11": "Stream not found",
  "12": "Stream fully claimed: no remaining balance",
  "13": "Batch too large: exceeds maximum recipients",
  "14": "Batch empty: no recipients provided",
  "15": "Token transfer failed",
  "16": "Insufficient balance to cover payment",
  "17": "Payment already cancelled",
  "18": "Contract paused: operations are temporarily disabled",
  "19": "No tokens available to withdraw",
  "20": "Upgrade not proposed: call propose_upgrade() first",
  // ── Upgrade + Multisig Errors (21-30) ───────────────────
  "21": "Upgrade timelock active: 24-hour delay has not elapsed",
  "22": "Multisig not configured: call set_multisig_config() first",
  "23": "Not a signer: you are not in the multisig signer list",
  "24": "Already approved: duplicate approval detected",
  "25": "Threshold not met: insufficient approvals",
  "26": "Already executed: this action has already been processed",
  "27": "Not a role holder: insufficient RBAC permissions",
  "28": "Audit log empty: no entries recorded",
  "29": "Audit entry not found",
  "30": "Recurring payment not found",
  // ── Recurring + Fee Errors (31-40) ────────────────────
  "31": "Recurring payment not yet due",
  "32": "Recurring payment already cancelled",
  "33": "Recurring payment expired: all payments completed",
  "34": "Fee configuration not found",
  "35": "Fee too high: exceeds maximum 1000 bps (10%)",
  "36": "Timelocked action not found",
  "37": "Timelocked action not yet due: 24-hour delay has not elapsed",
  "38": "Timelocked action already executed",
  "39": "Governance not configured: call configure_governance() first",
  "40": "Proposal not found",
  // ── Governance + Spend Errors (41-52) ──────────────────
  "41": "Voting period ended: proposal is closed",
  "42": "Proposal already executed",
  "43": "Quorum not met: insufficient votes cast",
  "44": "Proposal defeated: no votes exceeded yes votes",
  "45": "Deposit too low: must meet minimum proposal deposit",
  "46": "Spending limit expired: limit has been deactivated or expired",
  "47": "Refund not found",
  "48": "Refund already processed",
  "49": "Payment already refunded",
  "50": "Refund window expired",
  "51": "Already voted: each address may vote only once per proposal",
  "52": "Reentrant call detected: cross-contract reentry blocked",
  // ── Extended Errors (60-99) ────────────────────────────
  "60": "Proposal not passed: insufficient yes votes",
  "61": "Invalid signature: recovered signer does not match",
  "62": "Hook not found",
  "63": "Hook already exists: duplicate hook registration",
  "64": "Rate limit exceeded: too many requests",
  "65": "Asset not supported by this contract",
  "66": "Invalid metadata length: exceeds maximum allowed",
  "67": "Maximum recipients exceeded",
  "68": "Duplicate recipient in batch",
  "69": "Stream end time must be after start time",
  "70": "Escrow deadline must be in the future",
  "71": "Pending ownership transfer: accept or cancel first",
  "72": "Ownership transfer expired: timelock elapsed without acceptance",
  "73": "Invalid address format",
  "74": "Batch item failed: individual payment in batch error",
  "75": "Invalid recurring schedule type",
  "76": "Fee collector address not set",
  "77": "Emitter contract not linked: call set_emitter() first",
  "78": "Proposal deposit is locked: cannot withdraw while voting",
  "79": "Multisig signer limit exceeded",
  "80": "Invalid token contract address",
  "81": "Storage limit exceeded: contract storage is full",
  "82": "Contract migration required: upgrade to continue",
  "83": "Invalid event type for notification hook",
  "84": "Webhook URL too long: exceeds maximum length",
  "85": "Maximum notification hooks exceeded",
  "86": "Notification hook is not active",
  "87": "Cross-contract call failed",
  "88": "Invalid ScVal encoding in parameters",
  "89": "Unsupported operation: not available in this version",
  "90": "Contract not linked: configure linked contract first",
  "91": "Maximum signers exceeded for multisig",
  "92": "Zero address not allowed for this operation",
  "93": "Invalid network: wrong Stellar network configured",
  // Future expansion: codes 100-255 reserved
};

/**
 * Attempt to decode a Soroban contract error from a diagnostic event
 * or raw error value. Falls back to the raw value if unknown.
 */
export function decodeContractError(rawError: string): string {
  const trimmed = rawError.trim();

  // Check for Error(Contract, #N) pattern
  const codeMatch = trimmed.match(/Error\(Contract,\s*#(\d+)\)/);
  if (codeMatch && CONTRACT_ERROR_MAP[codeMatch[1]]) {
    return CONTRACT_ERROR_MAP[codeMatch[1]];
  }

  // Check for numeric error codes from diagnostic events
  if (CONTRACT_ERROR_MAP[trimmed]) {
    return CONTRACT_ERROR_MAP[trimmed];
  }

  // Return raw error if we can't decode it
  return rawError;
}

/**
 * Get all known contract errors for documentation / tooltips.
 */
export function getContractErrorCatalog(): { code: string; message: string }[] {
  return Object.entries(CONTRACT_ERROR_MAP).map(([code, message]) => ({
    code,
    message,
  })).sort((a, b) => parseInt(a.code) - parseInt(b.code));
}
