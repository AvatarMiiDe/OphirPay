// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";
import { createGovernanceProposal } from "@/lib/contract-advanced";

/**
 * GET /api/governance/proposals — list governance proposals
 * Reads from OphirPayContract.get_proposal() on-chain.
 */
export async function GET() {
  try {
    // First get total count
    const countResult = await simulateContractCall(
      DEFAULT_CONTRACT_ID,
      "get_proposal_count",
      CHAIN_READ_SOURCE
    );

    if (countResult.status === "SIMULATION_FAILED") {
      return successResponse({ proposals: [], available: false });
    }

    return successResponse(countResult.returnValue ?? 0);
  } catch (err) {
    return handleApiError(err, "GET /api/governance/proposals");
  }
}

/**
 * POST /api/governance/proposals — create a new proposal
 * Calls OphirPayContract.create_proposal() on-chain.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { proposer, title, description, actionType, target, data } = body;

    if (!proposer || !title) {
      return Response.json(
        { success: false, error: { code: "BAD_REQUEST", message: "proposer and title are required" } },
        { status: 400 }
      );
    }

    const result = await createGovernanceProposal(
      proposer,
      title,
      description ?? "",
      actionType ?? "custom",
      target ?? "",
      data ?? ""
    );

    if (!result.success) {
      return Response.json(
        { success: false, error: { code: "CONTRACT_ERROR", message: result.error } },
        { status: 400 }
      );
    }

    return successResponse({ txHash: result.txHash, proposalId: result.data }, undefined, 201);
  } catch (err) {
    return handleApiError(err, "POST /api/governance/proposals");
  }
}
