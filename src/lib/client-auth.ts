// SPDX-License-Identifier: MIT

/**
 * Client-side session helpers.
 *
 * Called by the wallet hook after a successful connect / before disconnect.
 * Same-origin fetches include cookies automatically, so no credentials flag
 * is required.
 *
 * Proof of ownership: when a `signMessage` provider is supplied (the wallet
 * supports message signing), the flow mints a server challenge, signs it with
 * the wallet, and presents the signature when opening the session. Without a
 * provider the request falls back to a renewal — only accepted by the server
 * when a valid session cookie already exists.
 */

export async function establishSession(
  publicKey: string,
  network: string,
  signMessage?: (message: string) => Promise<string>
): Promise<boolean> {
  try {
    let challenge: string | undefined;
    let signature: string | undefined;

    if (signMessage) {
      const res = await fetch(
        `/api/auth/challenge?publicKey=${encodeURIComponent(publicKey)}`
      );
      if (res.ok) {
        const json = (await res.json()) as {
          data?: { challenge?: string; message?: string };
        };
        challenge = json.data?.challenge;
        const message = json.data?.message;
        if (challenge && message) {
          signature = await signMessage(message);
        }
      }
    }

    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKey, network, challenge, signature }),
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
