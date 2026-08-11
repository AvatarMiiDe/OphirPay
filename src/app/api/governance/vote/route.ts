// SPDX-License-Identifier: MIT

import { successResponse, badRequestError, unauthorizedError, handleApiError } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-session";
import { voteOnProposal } from "@/lib/contract-advanced";

/**
 * POST /api/governance/vote — cast a vote on a proposal
 * Calls OphirPayContract.vote_on_proposal() on-chain.
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError(
        "Authentication required. Connect your wallet or provide an API key."
      );
    }

    const body = await request.json().catch(() => ({}));
    const { voter, proposalId, support, weight } = body;

    if (!voter || !proposalId) {
      return badRequestError("voter and proposalId are required");
    }

    const result = await voteOnProposal(
      voter,
      proposalId,
      support ?? true,
      weight ?? 1
    );

    if (!result.success) {
      return Response.json(
        { success: false, error: { code: "CONTRACT_ERROR", message: result.error } },
        { status: 400 }
      );
    }

    return successResponse({ voted: true, proposalId, txHash: result.txHash });
  } catch (err) {
    return handleApiError(err, "POST /api/governance/vote");
  }
}
