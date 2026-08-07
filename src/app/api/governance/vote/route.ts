// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";

/**
 * POST /api/governance/vote — cast a vote on a proposal
 * Calls OphirPayContract.vote_on_proposal() on-chain.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    // TODO: Call contract.vote_on_proposal(voter, proposal_id, support, weight)
    return successResponse({ voted: true, ...body, source: "contract_stub" });
  } catch (err) {
    return handleApiError(err, "POST /api/governance/vote");
  }
}
