// SPDX-License-Identifier: MIT

import { type NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api-auth";
import { successResponse, handleApiError, badRequestError } from "@/lib/api-response";
import { z } from "zod";

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  actor: z.string().optional(),
  action: z.string().optional(),
  since: z.coerce.number().int().positive().optional(),
});

export type AuditLogEntry = {
  id: number;
  timestamp: number;
  action: string;
  actor: string;
  target_id: number;
  details: string;
};

/**
 * GET /api/audit-log
 *
 * Returns contract audit log entries. Requires API-key authentication.
 * Supports pagination and filtering by actor, action, and timestamp.
 *
 * When Stellar mainnet audit indexing is live, this queries the contract's
 * persistent audit ledger on-chain.
 */
async function _GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
      const raw = Object.fromEntries(searchParams.entries());
      const parsed = auditLogQuerySchema.safeParse(raw);
      if (!parsed.success) {
        return badRequestError(
          parsed.error.issues.map((e) => e.message).join("; "),
        );
      }

      const { page, limit, actor, action, since } = parsed.data;

      // TODO: Replace with on-chain audit log query
      // const entries = await queryAuditLog({ page, limit, actor, action, since });

      const mockEntries: AuditLogEntry[] = [
        {
          id: 5,
          timestamp: Math.floor(Date.now() / 1000) - 60,
          action: "payment_recorded",
          actor: "GABC1234DEF5678EFGH9012IJKL3456MNOP7890",
          target_id: 42,
          details: "Payment recorded on-chain",
        },
        {
          id: 4,
          timestamp: Math.floor(Date.now() / 1000) - 120,
          action: "escrow_created",
          actor: "GDEF5678EFGH9012IJKL3456MNOP7890ABCD1234",
          target_id: 3,
          details: "Escrow created and funded",
        },
        {
          id: 3,
          timestamp: Math.floor(Date.now() / 1000) - 300,
          action: "multisig_configured",
          actor: "GABC1234DEF5678EFGH9012IJKL3456MNOP7890",
          target_id: 0,
          details: "Multisig threshold updated",
        },
        {
          id: 2,
          timestamp: Math.floor(Date.now() / 1000) - 600,
          action: "fee_config_set",
          actor: "GABC1234DEF5678EFGH9012IJKL3456MNOP7890",
          target_id: 0,
          details: "Fee configuration updated",
        },
        {
          id: 1,
          timestamp: Math.floor(Date.now() / 1000) - 900,
          action: "contract_unpaused",
          actor: "GABC1234DEF5678EFGH9012IJKL3456MNOP7890",
          target_id: 0,
          details: "Contract unpaused after maintenance",
        },
      ];

      const filtered = mockEntries.filter((entry) => {
        if (actor && entry.actor !== actor) return false;
        if (action && entry.action !== action) return false;
        if (since && entry.timestamp < since) return false;
        return true;
      });

      const total = filtered.length;
      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit);

      return successResponse(paginated, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiAuth(_GET);
