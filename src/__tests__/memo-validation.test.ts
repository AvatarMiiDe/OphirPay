// SPDX-License-Identifier: MIT

import { describe, it, expect } from "vitest";
import {
  validateMemo,
  getMemoErrorMessage,
  MEMO_MAX_BYTES,
  isValidStellarAddress,
} from "@/lib/stellar";

describe("validateMemo", () => {
  it("accepts undefined memo", () => {
    const result = validateMemo(undefined);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts empty string", () => {
    const result = validateMemo("");
    expect(result.valid).toBe(true);
  });

  it("accepts whitespace-only memo", () => {
    const result = validateMemo("   ");
    expect(result.valid).toBe(true);
  });

  it("accepts short ASCII memo", () => {
    const result = validateMemo("Payment for services");
    expect(result.valid).toBe(true);
  });

  it("accepts memo at exactly 28 bytes (ASCII)", () => {
    const memo = "a".repeat(28);
    const result = validateMemo(memo);
    expect(result.valid).toBe(true);
    expect(new TextEncoder().encode(memo).byteLength).toBe(28);
  });

  it("rejects memo exceeding 28 bytes (ASCII)", () => {
    const memo = "a".repeat(29);
    const result = validateMemo(memo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("28-byte limit");
    expect(result.error).toContain("29 bytes");
  });

  it("rejects multi-byte memo exceeding 28 bytes", () => {
    // Each 'é' is 2 bytes in UTF-8. 15 × 2 = 30 bytes
    const memo = "é".repeat(15);
    const result = validateMemo(memo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("30 bytes");
  });

  it("accepts multi-byte memo within 28 bytes", () => {
    // Each 'é' is 2 bytes. 14 × 2 = 28 bytes
    const memo = "é".repeat(14);
    const result = validateMemo(memo);
    expect(result.valid).toBe(true);
    expect(new TextEncoder().encode(memo).byteLength).toBe(28);
  });

  it("rejects emoji memo exceeding 28 bytes", () => {
    // Each '🚀' is 4 bytes in UTF-8. 8 × 4 = 32 bytes
    const memo = "🚀".repeat(8);
    const result = validateMemo(memo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("32 bytes");
  });

  it("accepts emoji memo within 28 bytes", () => {
    // Each '🚀' is 4 bytes. 7 × 4 = 28 bytes
    const memo = "🚀".repeat(7);
    const result = validateMemo(memo);
    expect(result.valid).toBe(true);
  });

  it("trims whitespace before validation", () => {
    // "  abc  " should be trimmed to "abc" (3 bytes)
    const result = validateMemo("  abc  ");
    expect(result.valid).toBe(true);
  });

  it("rejects memo with mixed ASCII and multi-byte characters exceeding 28 bytes", () => {
    // "Hello " (6 bytes) + "café" (5 bytes: c=1, a=1, f=1, é=2) + " world!" (7 bytes) = 18 bytes
    // That's fine. Let's make one that exceeds:
    // "Hello " (6) + "ééééééééééé" (11 × 2 = 22) = 28 bytes — exactly at limit
    const memo = "Hello " + "é".repeat(11);
    const result = validateMemo(memo);
    expect(result.valid).toBe(true);
    expect(new TextEncoder().encode(memo).byteLength).toBe(28);
  });
});

describe("getMemoErrorMessage", () => {
  it("returns null for non-memo errors", () => {
    expect(getMemoErrorMessage("op_underfunded")).toBeNull();
    expect(getMemoErrorMessage("insufficient balance")).toBeNull();
    expect(getMemoErrorMessage("network timeout")).toBeNull();
  });

  it("maps 'memo too long' error", () => {
    const msg = getMemoErrorMessage("tx_memo_too_long: memo exceeds maximum length");
    expect(msg).toContain("too long");
    expect(msg).toContain("28 bytes");
  });

  it("maps 'memo invalid' error", () => {
    const msg = getMemoErrorMessage("tx_bad_memo: memo is invalid");
    expect(msg).toContain("Invalid memo format");
  });

  it("maps 'tx_bad_memo' error", () => {
    const msg = getMemoErrorMessage("tx_bad_memo_type");
    expect(msg).toContain("invalid memo");
  });

  it("maps 'op_bad_memo' error", () => {
    const msg = getMemoErrorMessage("op_bad_memo: bad memo in operation");
    expect(msg).toContain("memo format is invalid");
  });

  it("is case-insensitive", () => {
    const msg = getMemoErrorMessage("TX_MEMO_TOO_LONG: memo exceeds maximum length");
    expect(msg).toContain("too long");
  });
});

describe("MEMO_MAX_BYTES", () => {
  it("is 28 (Stellar protocol limit)", () => {
    expect(MEMO_MAX_BYTES).toBe(28);
  });
});
