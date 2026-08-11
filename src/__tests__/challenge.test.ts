// SPDX-License-Identifier: MIT

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
  createChallengeToken,
  verifyChallengeToken,
  challengeMessage,
  verifyWalletSignature,
} from "@/lib/challenge";

const TEST_SECRET = "test-auth-secret-123456789012345678901234567890";

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", TEST_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("challenge tokens", () => {
  it("round-trips a minted challenge for the owning key", () => {
    const kp = Keypair.random();
    const token = createChallengeToken(kp.publicKey());
    expect(verifyChallengeToken(token, kp.publicKey())).toBe(true);
  });

  it("rejects a challenge presented for a different public key", () => {
    const owner = Keypair.random();
    const attacker = Keypair.random();
    const token = createChallengeToken(owner.publicKey());
    expect(verifyChallengeToken(token, attacker.publicKey())).toBe(false);
  });

  it("rejects tampered and malformed tokens", () => {
    const kp = Keypair.random();
    const token = createChallengeToken(kp.publicKey());
    const [body, sig] = token.split(".");
    expect(verifyChallengeToken(`${body}x.${sig}`, kp.publicKey())).toBe(false);
    expect(verifyChallengeToken("garbage", kp.publicKey())).toBe(false);
    expect(verifyChallengeToken("", kp.publicKey())).toBe(false);
  });

  it("rejects expired challenges", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const kp = Keypair.random();
    const token = createChallengeToken(kp.publicKey());
    // Advance past the 5-minute TTL
    vi.setSystemTime(new Date("2026-01-01T00:10:00Z"));
    expect(verifyChallengeToken(token, kp.publicKey())).toBe(false);
    vi.useRealTimers();
  });
});

describe("wallet signature verification", () => {
  it("accepts a base64 Ed25519 signature over the challenge message", () => {
    const kp = Keypair.random();
    const message = challengeMessage(kp.publicKey());
    const sig = kp.sign(Buffer.from(message, "utf8")).toString("base64");
    expect(verifyWalletSignature(message, sig, kp.publicKey())).toBe(true);
  });

  it("accepts hex-encoded signatures", () => {
    const kp = Keypair.random();
    const message = challengeMessage(kp.publicKey());
    const sig = kp.sign(Buffer.from(message, "utf8")).toString("hex");
    expect(verifyWalletSignature(message, sig, kp.publicKey())).toBe(true);
  });

  it("accepts the SEP-30 prefixed message variant", () => {
    const kp = Keypair.random();
    const message = challengeMessage(kp.publicKey());
    // Some wallets sign "Stellar Signed Message: <message>"
    const prefixed = `Stellar Signed Message: ${message}`;
    const sig = kp.sign(Buffer.from(prefixed, "utf8")).toString("base64");
    expect(verifyWalletSignature(message, sig, kp.publicKey())).toBe(true);
  });

  it("rejects a signature from a different key", () => {
    const owner = Keypair.random();
    const attacker = Keypair.random();
    const message = challengeMessage(owner.publicKey());
    const sig = attacker.sign(Buffer.from(message, "utf8")).toString("base64");
    expect(verifyWalletSignature(message, sig, owner.publicKey())).toBe(false);
  });

  it("rejects tampered signatures and garbage", () => {
    const kp = Keypair.random();
    const message = challengeMessage(kp.publicKey());
    expect(verifyWalletSignature(message, "A".repeat(88), kp.publicKey())).toBe(false);
    expect(verifyWalletSignature(message, "", kp.publicKey())).toBe(false);
    expect(verifyWalletSignature(message, "not-a-signature", kp.publicKey())).toBe(false);
    // Valid encoding, signature over a different message
    const other = kp.sign(Buffer.from("something else", "utf8")).toString("base64");
    expect(verifyWalletSignature(message, other, kp.publicKey())).toBe(false);
  });
});
