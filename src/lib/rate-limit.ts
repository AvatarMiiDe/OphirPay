// SPDX-License-Identifier: MIT

/**
 * Rate limit store abstraction with pluggable backends.
 * Default: in-memory Map (sufficient for single-instance dev).
 * Production: replace with Redis-backed store for multi-instance deployments.
 */

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  reset(key: string): Promise<void>;
}

/**
 * In-memory rate limit store.
 * Resets on cold start — suitable for development.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>();

  async increment(
    key: string,
    windowMs: number
  ): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
    }

    entry.count++;
    this.store.set(key, entry);
    return { count: entry.count, resetAt: entry.resetAt };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Redis-backed rate limit store (production).
 * Requires a Redis client instance with incr, expire, and del commands.
 */
export class RedisRateLimitStore implements RateLimitStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private redis: any) {}

  async increment(
    key: string,
    windowMs: number
  ): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const ttl = Math.ceil(windowMs / 1000);

    // Use Redis pipeline to INCR + EXPIRE atomically
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, ttl);
    }

    return { count, resetAt: now + windowMs };
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

/** Singleton rate limit store instance. Swap for Redis in production. */
let _store: RateLimitStore | null = null;

export function getRateLimitStore(): RateLimitStore {
  if (!_store) {
    _store = new InMemoryRateLimitStore();
  }
  return _store;
}

/** Replace the rate limit store at runtime (e.g., during app bootstrap). */
export function setRateLimitStore(store: RateLimitStore): void {
  _store = store;
}
