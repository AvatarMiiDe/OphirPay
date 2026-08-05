import { timingSafeEqual } from "@/lib/crypto";

/**
 * API authentication helpers.
 * In production, integrate with NextAuth, Clerk, or your auth provider.
 */

/**
 * Validate an API key against its stored hash.
 */
export function validateApiKey(rawKey: string, storedHash: string): boolean {
  // Hash the incoming key and compare with the stored hash
  const { createHash } = require("crypto") as typeof import("crypto");
  const hash = createHash("sha256").update(rawKey).digest("hex");
  return timingSafeEqual(hash, storedHash);
}

/**
 * Extract a Bearer token from an Authorization header.
 * Returns null if no token is present or format is invalid.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

/**
 * Check if a request is authenticated for admin operations.
 * Stubbed — always returns false until auth is implemented.
 */
export async function isAuthenticated(_request: Request): Promise<boolean> {
  // TODO: Implement proper session/JWT validation
  return false;
}
