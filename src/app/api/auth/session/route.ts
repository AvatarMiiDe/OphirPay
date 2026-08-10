// SPDX-License-Identifier: MIT

/**
 * Wallet session endpoints.
 *
 *   POST   /api/auth/session   — issue a signed session cookie for a wallet
 *   DELETE /api/auth/session   — revoke the session cookie
 *
 * The UI calls POST after a successful wallet connect. The cookie is
 * HttpOnly + SameSite=Lax + signed with AUTH_SECRET, and all data-bearing
 * routes resolve the user from it via getAuthContext().
 */

import {
  buildSessionCookie,
  buildLogoutCookie,
} from "@/lib/auth-session";
import { isValidStellarAddress } from "@/lib/stellar";
import { successResponse, badRequestError } from "@/lib/api-response";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as
    | { publicKey?: string; network?: string }
    | null;

  const publicKey = body?.publicKey?.trim() ?? "";
  if (!isValidStellarAddress(publicKey)) {
    return badRequestError(
      "A valid Stellar public key (G...) is required to open a session."
    );
  }

  const network = body?.network === "PUBLIC" ? "PUBLIC" : "TESTNET";

  const response = successResponse({ authenticated: true, publicKey, network });
  response.headers.set("Set-Cookie", buildSessionCookie(publicKey, network));
  return response;
}

export async function DELETE() {
  const response = successResponse({ authenticated: false });
  response.headers.set("Set-Cookie", buildLogoutCookie());
  return response;
}
