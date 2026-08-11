// SPDX-License-Identifier: MIT

import { successResponse, handleApiError, unauthorizedError } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-session";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";
import { createGovernanceProposal } from "@/lib/contract-advanced";
import { cachedFetch } from "@/lib/api-cache";

/**
 * GET /api/governance/proposals — list governance proposals
 * Reads from OphirPayContract.get_proposal() on-chain.
 * Cached for 30 seconds to reduce RPC load.
 */
export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError("Authentication required. Connect your wallet or provide an API key.");
    }

    // First get total count (cached, 30s TTL)
    const countResult = await cachedFetch(
      "gov:proposal_count",
      () => simulateContractCall(DEFAULT_CONTRACT_ID, "get_proposal_count", CHAIN_READ_SOURCE),
      30_000,
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
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError("Authentication required. Connect your wallet or provide an API key.");
    }

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
