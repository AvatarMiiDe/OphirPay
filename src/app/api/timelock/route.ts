// SPDX-License-Identifier: MIT

import { successResponse, handleApiError, unauthorizedError } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-session";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";
import { nativeToScVal } from "@stellar/stellar-sdk";

/**
 * GET /api/timelock — list pending timelocked actions from the Soroban contract.
 * Reads total count from OphirPayContract.get_timelock_count().
 * Use query param `id` to look up a specific action.
 */
export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError("Authentication required. Connect your wallet or provide an API key.");
    }

    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get("id");

    if (actionId) {
      const result = await simulateContractCall(
        DEFAULT_CONTRACT_ID,
        "get_timelocked_action",
        CHAIN_READ_SOURCE,
        [nativeToScVal(actionId, { type: "u64" })]
      );

      if (result.status === "SIMULATION_FAILED") {
        return successResponse({ available: false });
      }
      return successResponse(result.returnValue);
    }

    // Get total count
    const countResult = await simulateContractCall(
      DEFAULT_CONTRACT_ID,
      "get_timelock_count",
      CHAIN_READ_SOURCE
    );

    if (countResult.status === "SIMULATION_FAILED") {
      return successResponse({ count: 0, actions: [], available: false });
    }

    return successResponse({ count: countResult.returnValue ?? 0 });
  } catch (err) {
    return handleApiError(err, "GET /api/timelock");
  }
}
