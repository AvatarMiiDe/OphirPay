// SPDX-License-Identifier: MIT

/**
 * Lightweight runtime validation — no Zod required.
 * For when you need quick client-side validation without importing the Zod schema.
 */

/** Validate a Stellar amount string (must be positive, max 7 decimals). */
export function validateAmount(value: string): string | null {
  if (!value) return "Amount is required";
  const num = parseFloat(value);
  if (isNaN(num)) return "Amount must be a number";
  if (num <= 0) return "Amount must be greater than 0";
  if (num > 1e12) return "Amount is too large";
  const decimals = value.includes(".") ? value.split(".")[1].length : 0;
  if (decimals > 7) return "Amount can have at most 7 decimal places";
  return null;
}

/** Validate a memo string for Stellar transactions. */
export function validateMemo(value: string): string | null {
  if (!value) return null; // Memo is optional
  if (value.length > 28) return "Memo must be 28 characters or fewer";
  return null;
}

/** Validate that two values match (e.g., confirm address). */
export function validateMatch(a: string, b: string, label: string): string | null {
  if (a !== b) return `${label} values do not match`;
  return null;
}
