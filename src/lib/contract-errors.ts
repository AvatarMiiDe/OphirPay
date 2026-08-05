/**
 * Soroban contract error decoding utilities.
 * Maps raw contract error codes and diagnostic events to human-readable messages.
 */

const CONTRACT_ERROR_MAP: Record<string, string> = {
  "1": "Invalid amount: must be greater than zero",
  "2": "Insufficient balance to cover payment",
  "3": "Unauthorized caller: only the contract owner may call this function",
  "4": "Invalid destination address",
  "5": "Payment already processed (duplicate nonce)",
  "6": "Batch size exceeds maximum allowed",
  "7": "Invalid signature: recovered signer does not match",
  "8": "Contract paused: operations are temporarily disabled",
  "9": "Invalid token: asset not supported by this contract",
  "10": "Arithmetic overflow in payment calculation",
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
  }));
}
