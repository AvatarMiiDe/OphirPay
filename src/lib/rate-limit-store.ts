/**
 * Pluggable rate limit store interface.
 * Currently uses an in-memory Map, but can be swapped for Redis in production
 * by implementing the same RateLimitStore interface.
 */

export interface RateLimitStore {
  increment(key: string, windowMs: number, maxRequests: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }>;
}

/**
 * In-memory rate limit store (default for development).
 * Replace with RedisRateLimitStore for production multi-instance deployments.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>();

  async increment(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      this.store.set(key, entry);
    }

    entry.count++;
    const remaining = Math.max(0, maxRequests - entry.count);

    // Clean up expired entries periodically
    if (this.store.size > 10000) {
      for (const [k, v] of this.store) {
        if (v.resetAt < now) this.store.delete(k);
      }
    }

    return {
      allowed: entry.count <= maxRequests,
      remaining,
      resetAt: entry.resetAt,
    };
  }
}

/** Singleton rate limit store instance */
export const rateLimitStore: RateLimitStore = new MemoryRateLimitStore();
