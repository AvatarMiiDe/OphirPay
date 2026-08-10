// SPDX-License-Identifier: MIT

import { withApiAuth } from "@/lib/api-auth";
import { successResponse, badRequestError, handleApiError } from "@/lib/api-response";
import { executeGovernanceProposal } from "@/lib/contract-advanced";
import { z } from "zod";

const executeSchema = z.object({
  proposalId: z.number().int().positive("proposalId must be a positive integer"),
});

/**
 * POST /api/governance/execute
 * Execute a passed governance proposal on-chain. Requires API-key authentication.
 */
async function _POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return badRequestError("Request body is required and must be valid JSON");
    }

    const parsed = executeSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestError(
        parsed.error.issues.map((e) => e.message).join("; ")
      );
    }

    const { proposalId } = parsed.data;

    const result = await executeGovernanceProposal(proposalId);

    if (!result.success) {
      return Response.json(
        { success: false, error: { code: "CONTRACT_ERROR", message: result.error } },
        { status: 400 }
      );
    }

    return successResponse({ executed: true, proposalId, txHash: result.txHash });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiAuth(_POST);
