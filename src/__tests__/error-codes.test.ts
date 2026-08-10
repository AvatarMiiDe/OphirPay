// SPDX-License-Identifier: MIT

import { describe, it, expect } from "vitest";
import { ERROR_CODES, ERROR_STATUS } from "@/lib/error-codes";

describe("ERROR_CODES", () => {
  it("all error codes have a corresponding HTTP status", () => {
    const codes = Object.values(ERROR_CODES) as string[];
    for (const code of codes) {
      expect(ERROR_STATUS[code]).toBeDefined();
      expect(ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
      expect(ERROR_STATUS[code]).toBeLessThan(600);
    }
  });

  it("every category has the right status range", () => {
    expect(ERROR_STATUS[ERROR_CODES.BAD_REQUEST]).toBe(400);
    expect(ERROR_STATUS[ERROR_CODES.UNAUTHORIZED]).toBe(401);
    expect(ERROR_STATUS[ERROR_CODES.FORBIDDEN]).toBe(403);
    expect(ERROR_STATUS[ERROR_CODES.NOT_FOUND]).toBe(404);
    expect(ERROR_STATUS[ERROR_CODES.CONFLICT]).toBe(409);
    expect(ERROR_STATUS[ERROR_CODES.RATE_LIMITED]).toBe(429);
    expect(ERROR_STATUS[ERROR_CODES.INTERNAL_ERROR]).toBe(500);
    expect(ERROR_STATUS[ERROR_CODES.CONTRACT_UNAVAILABLE]).toBe(503);
  });

  it("payment-specific codes are defined", () => {
    expect(ERROR_CODES.PAYMENT_FAILED).toBeDefined();
    expect(ERROR_CODES.INSUFFICIENT_FUNDS).toBeDefined();
    expect(ERROR_CODES.TRANSACTION_FAILED).toBeDefined();
  });

  it("multisig-specific codes are defined", () => {
    expect(ERROR_CODES.THRESHOLD_NOT_MET).toBeDefined();
    expect(ERROR_CODES.ALREADY_APPROVED).toBeDefined();
    expect(ERROR_CODES.ALREADY_EXECUTED).toBeDefined();
  });

  it("governance-specific codes are defined", () => {
    expect(ERROR_CODES.PROPOSAL_NOT_FOUND).toBeDefined();
    expect(ERROR_CODES.VOTING_ENDED).toBeDefined();
    expect(ERROR_CODES.PROPOSAL_ALREADY_EXECUTED).toBeDefined();
  });
});
