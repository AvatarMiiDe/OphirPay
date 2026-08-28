// SPDX-License-Identifier: MIT

import { nativeToScVal } from "@stellar/stellar-sdk";
import { withApiAuth } from "@/lib/api-auth";
import { successResponse, handleApiError, badRequestError } from "@/lib/api-response";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";
import { z } from "zod";
import { withRequestLogging } from "@/lib/request-logging";

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  actor: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  // Unix timestamps (seconds) — inclusive range bounds on entry.timestamp
  since: z.coerce.number().int().positive().optional(),
  until: z.coerce.number().int().positive().optional(),
});

export type AuditLogEntry = {
  id: number;
  timestamp: number;
  action: string;
  actor: string;
  target_id: number;
  details: string;
};

/** Read a page of audit entries, most recent first, in parallel batches of 10. */
async function readAuditEntries(
  ids: number[]
): Promise<AuditLogEntry[]> {
  const entries: AuditLogEntry[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const results = await Promise.all(
      chunk.map(async (id) => {
        try {
          const entryResult = await simulateContractCall(
            DEFAULT_CONTRACT_ID,
            "get_audit_entry",
            CHAIN_READ_SOURCE,
            [nativeToScVal(id, { type: "u64" })]
          );
          if (entryResult.status === "SIMULATION_FAILED" || !entryResult.returnValue) {
            return null;
          }
          return entryResult.returnValue as AuditLogEntry;
        } catch {
          // Skip entries we can't read
          return null;
        }
      })
    );
    for (const entry of results) {
      if (entry) entries.push(entry);
    }
  }
  return entries;
}

/**
 * GET /api/audit-log
 *
 * Returns contract audit log entries. Requires API-key authentication.
 * Queries the OphirPayContract's persistent audit ledger on-chain.
 *
 * Supports pagination plus filtering by actor (substring, case-insensitive),
 * action (exact), and a since/until timestamp range — filters compose with
 * pagination, so `total` reflects the filtered result set.
 */
async function _GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams.entries());
    const parsed = auditLogQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return badRequestError(
        parsed.error.issues.map((e) => e.message).join("; ")
      );
    }

    const { page, limit, actor, action, since, until } = parsed.data;
    const hasFilters =
      actor !== undefined ||
      action !== undefined ||
      since !== undefined ||
      until !== undefined;

    // Get total count from contract
    const countResult = await simulateContractCall(
      DEFAULT_CONTRACT_ID,
      "get_audit_log_count",
      CHAIN_READ_SOURCE
    );

    if (countResult.status === "SIMULATION_FAILED") {
      return successResponse([], {
        page,
        limit,
        total: 0,
      });
    }

    const totalCount = Number(countResult.returnValue ?? 0);
    if (totalCount === 0) {
      return successResponse([], { page, limit, total: 0 });
    }

    // Which entries to read (ids are 1-indexed, most recent = highest id):
    // - No filters: only the page window, so unfiltered reads stay cheap.
    // - Filters: scan the whole ledger so the filtered `total` (and therefore
    //   pagination) is exact regardless of where matches fall.
    const ids: number[] = [];
    if (hasFilters) {
      for (let id = totalCount; id >= 1; id--) ids.push(id);
    } else {
      const startId = Math.max(1, totalCount - (page - 1) * limit);
      const endId = Math.max(1, startId - limit + 1);
      for (let id = startId; id >= endId; id--) ids.push(id);
    }

    const entries = await readAuditEntries(ids);

    // Apply filters (mirrors the UI's client-side live-entry predicate):
    // actor substring (case-insensitive), action exact match, inclusive
    // since/until timestamp range.
    const actorQuery = actor?.toLowerCase();
    const filtered = entries.filter((e) => {
      if (actorQuery && !(e.actor ?? "").toLowerCase().includes(actorQuery)) {
        return false;
      }
      if (action && e.action !== action) return false;
      if (since !== undefined && e.timestamp < since) return false;
      if (until !== undefined && e.timestamp > until) return false;
      return true;
    });

    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return successResponse(paged, {
      page,
      limit,
      total: hasFilters ? filtered.length : totalCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withRequestLogging(withApiAuth(_GET));
