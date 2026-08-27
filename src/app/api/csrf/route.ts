// SPDX-License-Identifier: MIT

import { NextResponse } from "next/server";
import { generateCsrfToken, csrfCookieHeader } from "@/lib/csrf";

/**
 * GET /api/csrf
 * 
 * Mints a new CSRF token and sets it as an HttpOnly cookie.
 * The token is also returned in the response body for the client
 * to store in memory and send as the x-csrf-token header on
 * mutating requests.
 * 
 * Security:
 * - Token is cryptographically random (256 bits)
 * - Cookie is HttpOnly, Secure (prod), SameSite=Strict
 * - Cookie uses __Host- prefix in production (host-only)
 * - Token rotates on each mint (invalidates previous token)
 */
export async function GET(): Promise<NextResponse> {
  const token = generateCsrfToken();
  const isSecure = process.env.NODE_ENV === "production";
  
  const response = NextResponse.json({ token });
  response.headers.set("Set-Cookie", csrfCookieHeader(token, isSecure));
  
  return response;
}