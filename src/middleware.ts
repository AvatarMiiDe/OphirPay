// SPDX-License-Identifier: MIT

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // requests per window per IP

// In-memory rate limit store (Edge Runtime safe — no Redis, no ioredis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function checkRateLimit(
  ip: string
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  entry.count++;
  rateLimitMap.set(ip, entry);

  // Periodic cleanup
  if (rateLimitMap.size > 10_000) {
    for (const [k, v] of rateLimitMap) {
      if (v.resetAt < now) rateLimitMap.delete(k);
    }
  }

  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  return { allowed: entry.count <= RATE_LIMIT_MAX, remaining, resetAt: entry.resetAt };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = generateRequestId();

  // Only apply API-specific logic to API routes
  if (!pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    response.headers.set("X-Request-Id", requestId);
    return response;
  }

  // Skip rate limiting for health checks and metrics (monitoring endpoints
  // are hit frequently by orchestrators and should never be throttled)
  const skipRateLimit = pathname === "/api/health" || pathname === "/api/metrics";

  let remaining = RATE_LIMIT_MAX;
  let resetAt = Date.now() + RATE_LIMIT_WINDOW_MS;

  if (!skipRateLimit) {
    const ip = getClientIp(request);
    const result = checkRateLimit(ip);
    remaining = result.remaining;
    resetAt = result.resetAt;

    // Rate limit exceeded
    if (!result.allowed) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-Request-Id": requestId,
          },
        }
      );
    }
  }

  const response = NextResponse.next();

  // Security, CORS, and observability headers
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("X-Api-Version", "1.0.0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

  // Production CORS — restrict origins in production
  const origin = request.headers.get("origin") || "";
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ].filter(Boolean);
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
    response.headers.set("Access-Control-Allow-Origin", origin || "*");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
