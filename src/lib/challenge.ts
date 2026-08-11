// SPDX-License-Identifier: MIT

/**
 * Proof-of-ownership challenge for wallet sessions.
 *
 * Issuing a session on wallet *connect* alone is insufficient — an attacker
 * who learns (or is given) a public key could impersonate the holder. These
 * helpers bind the session to a fresh Ed25519 signature produced by the
 * wallet over a short-lived, server-signed challenge.
 *
 * Flow:
 *   1. Client calls GET /api/auth/challenge?publicKey=... → { challenge, message }
 *      where `challenge` is a stateless token signed with AUTH_SECRET (no
 *      server state, safe across instances) and `message` is the exact string
 *      the wallet must sign.
 *   2. The wallet signs `message` (e.g. Freighter/xBull/Albedo signMessage).
 *   3. Client POSTs { publicKey, challenge, signature } to /api/auth/session.
 *   4. The server verifies the challenge token, then verifies the Ed25519
 *      signature against the message derived from the challenge.
 *
 * The signature is verified against both the raw message and the
 * "Stellar Signed Message: " prefixed variant (SEP-30) so wallets that wrap
 * the message keep working. Base64 and hex signature encodings are accepted.
 */

import crypto from "crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { getAuthSecret } from "@/lib/auth-session";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MESSAGE_PREFIX = "Stellar Signed Message: ";

// ── Challenge token (stateless, HMAC-signed) ──────────────────

interface ChallengePayload {
  pk: string; // public key the challenge was minted for
  exp: number; // expiry (ms epoch)
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** Create a signed challenge token bound to a public key. */
export function createChallengeToken(publicKey: string): string {
  const payload: ChallengePayload = {
    pk: publicKey,
    exp: Date.now() + CHALLENGE_TTL_MS,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

/** Verify a challenge token (signature, expiry, key binding) without state. */
export function verifyChallengeToken(
  token: string,
  publicKey: string
): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [body, sig] = parts;
  if (!body || !sig) return false;

  const expected = crypto
    .createHmac("sha256", getAuthSecret())
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as ChallengePayload;
    if (payload.pk !== publicKey) return false;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** The canonical message a wallet must sign for a given challenge token. */
export function challengeMessage(publicKey: string): string {
  return `ophirpay:login:${publicKey}`;
}

// ── Signature verification ────────────────────────────────────

/**
 * Verify an Ed25519 signature over the challenge message.
 * Accepts base64 or hex signatures; tries the raw message and the SEP-30
 * prefixed variant to accommodate wallet format differences.
 */
export function verifyWalletSignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  const sigBytes = decodeSignature(signature);
  if (!sigBytes || sigBytes.length !== 64) return false;

  let keypair: Keypair;
  try {
    keypair = Keypair.fromPublicKey(publicKey);
  } catch {
    return false;
  }

  const candidates = [message, `${MESSAGE_PREFIX}${message}`];
  return candidates.some((candidate) => {
    try {
      return keypair.verify(Buffer.from(candidate, "utf8"), sigBytes);
    } catch {
      return false;
    }
  });
}

function decodeSignature(signature: string): Buffer | null {
  const trimmed = signature.trim();
  if (!trimmed) return null;
  // base64 first (most common), then hex. Buffer.from is lenient — it rarely
  // throws, so only accept decodes that yield exactly 64 bytes (Ed25519).
  try {
    const base64 = Buffer.from(trimmed, "base64");
    if (base64.length === 64) return base64;
  } catch {
    /* fall through to hex */
  }
  try {
    const hex = Buffer.from(trimmed, "hex");
    if (hex.length === 64) return hex;
  } catch {
    /* fall through */
  }
  return null;
}
