// SPDX-License-Identifier: MIT

import { z } from "zod";

/**
 * Pagination computation utilities shared between client and server.
 */

// ── Keyset (cursor) pagination ────────────────────────────────

/**
 * Opaque cursor payload for keyset pagination.
 *
 * The cursor identifies the last row of the previous page so the next page
 * can continue from it with a `createdAt DESC, id DESC` tiebreak — this
 * gives stable ordering under concurrent inserts, unlike offset pagination
 * which can skip/duplicate rows when new records are written mid-paging.
 */
export interface CursorPayload {
  /** ISO-8601 timestamp of the anchor row (createdAt). */
  createdAt: string;
  /** Stable unique id of the anchor row (id) — the tiebreaker. */
  id: string;
}

const cursorPayloadSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.string().min(1).max(64),
});

/**
 * Encode a cursor payload into an opaque, URL-safe token.
 *
 * The token is base64url of JSON — opaque to clients (they must not parse or
 * build it) and safe to embed in query strings.
 */
export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/**
 * Decode and validate an opaque cursor token.
 *
 * Returns `null` for anything that is not a well-formed, schema-valid cursor
 * (non-base64, tampered JSON, wrong shape, invalid date) so callers can
 * reject it with a 400.
 */
export function decodeCursor(raw: string): CursorPayload | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    );
    const result = cursorPayloadSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// ── Offset pagination metadata ────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Compute pagination metadata from raw parameters.
 */
export function computePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Compute skip/take values for Prisma queries.
 */
export function prismaPagination(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}
