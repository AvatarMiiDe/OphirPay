/**
 * Stellar memo validation utilities.
 * Supports text, ID, hash, and return memo types.
 */

export type MemoType = "text" | "id" | "hash" | "return";

interface MemoValidationResult {
  valid: boolean;
  type: MemoType;
  error?: string;
}

const MEMO_LIMITS: Record<MemoType, number> = {
  text: 28,    // UTF-8 bytes
  id: 0,       // 64-bit unsigned integer (no byte limit needed)
  hash: 32,    // 32 bytes (64 hex chars)
  return: 32,  // 32 bytes (64 hex chars)
};

/**
 * Detect and validate a Stellar memo value.
 * Returns the memo type and whether it's valid.
 */
export function validateMemo(value: string, type: MemoType = "text"): MemoValidationResult {
  if (!value) return { valid: true, type };

  if (type === "id") {
    const id = parseFloat(value);
    if (isNaN(id) || id < 0 || !Number.isSafeInteger(id)) {
      return { valid: false, type, error: "Memo ID must be a non-negative integer." };
    }
    if (id > Number.MAX_SAFE_INTEGER) {
      return { valid: false, type, error: "Memo ID exceeds maximum safe integer." };
    }
    return { valid: true, type };
  }

  if (type === "hash" || type === "return") {
    if (!/^[0-9a-fA-F]{64}$/.test(value)) {
      return { valid: false, type, error: `Memo ${type} must be a 64-character hex string.` };
    }
    return { valid: true, type };
  }

  // Text memo
  if (new TextEncoder().encode(value).length > MEMO_LIMITS.text) {
    return { valid: false, type, error: `Memo text must be 28 bytes or fewer.` };
  }

  return { valid: true, type };
}

/**
 * Auto-detect the memo type from its value.
 */
export function detectMemoType(value: string): MemoType {
  if (!value) return "text";
  if (/^\d+$/.test(value)) return "id";
  if (/^[0-9a-fA-F]{64}$/.test(value)) return "hash";
  return "text";
}
