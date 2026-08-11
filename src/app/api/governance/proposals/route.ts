// SPDX-License-Identifier: MIT

import { successResponse, handleApiError, unauthorizedError } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-session";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";
import { createGovernanceProposal } from "@/lib/contract-advanced";
import { cachedFetch } from "@/lib/api-cache";
import { verifyCsrf } from "@/lib/csrf";
import { validateBody, createProposalSchema } from "@/lib/validation-schemas";
import { nativeToScVal } from "@stellar/stellar-sdk";

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
      return successResponse([]);
    }

    const totalCount = Number(countResult.returnValue ?? 0);
    if (totalCount === 0) return successResponse([]);

    // Enumerate proposals by id (most recent last). Cap the loop to bound the
    // N+1 read pattern (one RPC per proposal).
    const maxProposals = 100;
    const toFetch = Math.min(totalCount, maxProposals);

    const proposals: unknown[] = [];
    for (let id = 1; id <= toFetch; id++) {
      const result = await cachedFetch(
        `gov:proposal:${id}`,
        () => simulateContractCall(
          DEFAULT_CONTRACT_ID,
          "get_proposal",
          CHAIN_READ_SOURCE,
          [nativeToScVal(id, { type: "u64" })]
        ),
        30_000,
      );
      if (result.status !== "SIMULATION_FAILED" && result.returnValue) {
        proposals.push(result.returnValue);
      }
    }

    return successResponse(proposals);
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
    const csrfError = verifyCsrf(request);
    if (csrfError) return csrfError;

    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError("Authentication required. Connect your wallet or provide an API key.");
    }

    const parsed = await validateBody(request, createProposalSchema);
    if (!parsed.success) return parsed.response;
    const { proposer, title, description, actionType, target, data, depositAsset, depositAmount } = parsed.data;

    const result = await createGovernanceProposal(
      proposer,
      title,
      description ?? "",
      actionType ?? "custom",
      target ?? "",
      data ?? "",
      depositAsset ?? "",
      depositAmount ?? 0
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
