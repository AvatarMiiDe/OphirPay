// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";

/**
 * GET /api/fee-config/collector — current fee collector address
 * Reads from OphirPayContract.get_fee_collector() on-chain.
 */
export async function GET() {
  try {
    const result = await simulateContractCall(
      DEFAULT_CONTRACT_ID,
      "get_fee_collector",
      CHAIN_READ_SOURCE
    );

    if (result.status === "SIMULATION_FAILED") {
      return successResponse({ available: false, collector: null });
    }

    return successResponse({ collector: result.returnValue ?? null });
  } catch (err) {
    return handleApiError(err, "GET /api/fee-config/collector");
  }
}
