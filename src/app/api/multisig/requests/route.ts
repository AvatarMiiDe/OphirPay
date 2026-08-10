// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";

/**
 * GET /api/multisig/requests — list pending approval requests
 * Reads from OphirPayContract.get_approval_request() on-chain.
 * Note: contract iteration requires knowing the total count first,
 * then fetching each request by ID. For now, returns latest requests.
 */
export async function GET() {
  try {
    const result = await simulateContractCall(
      DEFAULT_CONTRACT_ID,
      "get_approval_request",
      CHAIN_READ_SOURCE
    );

    if (result.status === "SIMULATION_FAILED") {
      return successResponse({ requests: [], available: false });
    }

    return successResponse(result.returnValue ? [result.returnValue] : []);
  } catch (err) {
    return handleApiError(err, "GET /api/multisig/requests");
  }
}
