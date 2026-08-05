/**
 * API authentication middleware for validating API keys against the database.
 * Enforces bearer token authentication on protected API routes.
 */
import prisma from "@/lib/prisma";
import { unauthorizedError } from "@/lib/api-response";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Authenticate a request using the Authorization: Bearer <api_key> header.
 * Returns the authenticated user ID, or null if authentication fails.
 */
export async function authenticateRequest(
  request: Request | NextRequest
): Promise<{ userId: string; keyId: string } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) return null;

  // Hash the key for lookup (SHA-256 of the raw key)
  const keyHash = await hashApiKey(rawKey);
  const prefix = rawKey.slice(0, 8);

  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash, prefix },
  });

  if (!apiKey) return null;

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() },
  });

  return { userId: apiKey.userId, keyId: apiKey.id };
}

/**
 * Middleware helper: check authentication and return an error response if not authorized.
 * Use this in API route handlers to protect endpoints.
 */
export async function requireAuth(
  request: Request
): Promise<{ userId: string } | NextResponse> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return unauthorizedError("Valid API key required. Provide Authorization: Bearer <key>");
  }
  return { userId: auth.userId };
}

/**
 * Hash an API key using SHA-256 for secure storage.
 * Uses Web Crypto API available in Edge/Node runtime.
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
