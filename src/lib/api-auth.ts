import crypto from "crypto";
import { timingSafeEqual } from "@/lib/crypto";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * API authentication helpers.
 * Supports: Bearer API keys (validated against DB) and X-API-Key header.
 */

/** Hash a raw API key for storage/comparison */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/** Validate a raw API key against a stored hash */
export function validateApiKey(rawKey: string, storedHash: string): boolean {
  const hash = hashApiKey(rawKey);
  return timingSafeEqual(hash, storedHash);
}

/** Extract Bearer token or X-API-Key from request headers */
export function extractApiKey(request: Request): string | null {
  // Try Authorization: Bearer <key>
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return parts[1];
    }
  }
  // Try X-API-Key header
  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader) return apiKeyHeader;

  return null;
}

/** Authenticate a request against stored API keys in the database */
export async function authenticateRequest(request: Request): Promise<{
  authenticated: boolean;
  keyId?: string;
  keyName?: string;
}> {
  const rawKey = extractApiKey(request);
  if (!rawKey) return { authenticated: false };

  try {
    const keys = await prisma.apiKey.findMany({
      select: { id: true, name: true, keyHash: true, expiresAt: true },
    });

    for (const key of keys) {
      // Check expiry
      if (key.expiresAt && new Date(key.expiresAt) < new Date()) continue;
      // Validate hash
      if (validateApiKey(rawKey, key.keyHash)) {
        // Update lastUsed atomically (fire-and-forget)
        prisma.apiKey
          .update({ where: { id: key.id }, data: { lastUsed: new Date() } })
          .catch(() => {});
        return { authenticated: true, keyId: key.id, keyName: key.name };
      }
    }
  } catch {
    // DB unavailable — reject
    return { authenticated: false };
  }

  return { authenticated: false };
}

/** Middleware-style wrapper: require API key auth for a route handler */
export function withApiAuth(
  handler: (request: Request, ...args: unknown[]) => Promise<Response>
) {
  return async (request: Request, ...args: unknown[]): Promise<Response> => {
    const { authenticated } = await authenticateRequest(request);
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Valid API key required. Use Authorization: Bearer <key> or X-API-Key header." } },
        { status: 401 }
      );
    }
    return handler(request, ...args);
  };
}
