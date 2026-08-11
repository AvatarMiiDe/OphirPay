// SPDX-License-Identifier: MIT

import { withApiAuth } from "@/lib/api-auth";
import { successResponse, handleApiError } from "@/lib/api-response";
import { verifyCsrf } from "@/lib/csrf";
import { validateBody, executeProposalSchema } from "@/lib/validation-schemas";
import { executeGovernanceProposal } from "@/lib/contract-advanced";

/**
 * POST /api/governance/execute
 * Execute a passed governance proposal on-chain. Requires API-key authentication.
 */
async function _POST(request: Request) {
  try {
    const csrfError = verifyCsrf(request);
    if (csrfError) return csrfError;

    const parsed = await validateBody(request, executeProposalSchema);
    if (!parsed.success) return parsed.response;
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
