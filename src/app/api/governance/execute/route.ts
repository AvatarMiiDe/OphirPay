// SPDX-License-Identifier: MIT

import { withApiAuth } from "@/lib/api-auth";
import { successResponse, badRequestError, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const executeSchema = z.object({
  proposalId: z.number().int().positive("proposalId must be a positive integer"),
});

/**
 * POST /api/governance/execute
 *
 * Execute a passed governance proposal on-chain.
 * Requires API-key authentication.
 *
 * This is a future-facing endpoint — when governance is deployed on Stellar
 * mainnet, the contract call replaces the placeholder logic.
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
        parsed.error.issues.map((e) => e.message).join("; "),
      );
    }

      const { proposalId } = parsed.data;

      // TODO: Replace with actual Soroban contract invocation
      // const tx = await executeProposal(proposalId);
      // return successResponse({ txHash: tx.hash, proposalId });

      return successResponse({
        executed: true,
        proposalId,
        message: "Governance proposal execution is not yet live on mainnet.",
      });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiAuth(_POST);
