// SPDX-License-Identifier: MIT

/**
 * Client-side session helpers.
 *
 * Called by the wallet hook after a successful connect / before disconnect.
 * Same-origin fetches include cookies automatically, so no credentials flag
 * is required.
 */

/** Exchange a connected wallet identity for a signed session cookie. */
export async function establishSession(
  publicKey: string,
  network: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKey, network }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Revoke the session cookie (on wallet disconnect). */
export async function revokeSession(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch {
    // Best-effort — the cookie also expires on its own
  }
}
