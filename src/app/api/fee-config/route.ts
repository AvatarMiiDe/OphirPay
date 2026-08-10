// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";

/**
 * GET /api/fee-config — current fee configuration from the Soroban contract.
 * Simulates a read-only call to OphirPayContract.get_fee_config().
 */
export async function GET() {
  try {
    const result = await simulateContractCall(
      DEFAULT_CONTRACT_ID,
      "get_fee_config",
      CHAIN_READ_SOURCE
    );

    if (result.status === "SIMULATION_FAILED") {
      // Contract not deployed or unreachable — return safe default
      return successResponse({ available: false, error: result.error });
    }

    return successResponse(result.returnValue);
  } catch (err) {
    return handleApiError(err, "GET /api/fee-config");
  }
}
