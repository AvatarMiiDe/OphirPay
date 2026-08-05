/**
 * Memo hashing utility for privacy-preserving Stellar memos.
 * Stellar memos are public — this utility lets you hash sensitive
 * references before placing them in a transaction memo, so the
 * recipient can verify against a known value without exposing it.
 */

/**
 * Create a simple hash of a string using SubtleCrypto (SHA-256 truncated to 28 chars).
 * Stellar text memos are limited to 28 bytes, so we truncate.
 */
export async function hashMemo(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 28); // Stellar memo limit
}

/**
 * Synchronous fallback using a basic string hash (djb2).
 * Use this when SubtleCrypto is unavailable (e.g., SSR).
 */
export function hashMemoSync(input: string, length = 28): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").slice(0, length);
}

/**
 * Verify that a memo matches a known reference value.
 */
export function verifyMemo(memo: string, reference: string): boolean {
  return hashMemoSync(memo) === hashMemoSync(reference) || memo === reference;
}
