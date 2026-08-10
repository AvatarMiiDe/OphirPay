// SPDX-License-Identifier: MIT

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { InMemoryRateLimitStore } from "@/lib/rate-limit";

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
// Configurable via RATE_LIMIT_RPM env (defaults to 120 requests/min/IP)
const RATE_LIMIT_MAX = Math.max(
  1,
  parseInt(process.env.RATE_LIMIT_RPM || "120", 10) || 120
);

// Single shared in-memory rate limit store (Edge Runtime safe)
// NOTE: per-instance by design. For multi-instance production rate
// limiting, terminate TLS at a load balancer / gateway that enforces
// limits, or route through a Redis-backed limiter at the platform layer.
const rateLimitStore = new InMemoryRateLimitStore();

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = generateRequestId();

  // Skip rate limiting for health checks and metrics (monitoring endpoints
  // are hit frequently by orchestrators and should never be throttled)
  const skipRateLimit = pathname === "/api/health" || pathname === "/api/metrics";

  let remaining = RATE_LIMIT_MAX;
  let resetAt = Date.now() + RATE_LIMIT_WINDOW_MS;

  if (!skipRateLimit) {
    const ip = getClientIp(request);
    const result = await rateLimitStore.increment(ip, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX);
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
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
