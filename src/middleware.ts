import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-memory rate limit store (resets on cold start — sufficient for dev, replace with Redis in prod)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // requests per window per IP

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const now = Date.now();

  let entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, entry);
  }

  entry.count++;

  const response = NextResponse.next();

  // Add CORS headers for API routes
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("X-Api-Version", "1.0.0");
  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, RATE_LIMIT_MAX - entry.count)));

  if (entry.count > RATE_LIMIT_MAX) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)) },
      }
    );
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
