// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";

/**
 * GET /api/fee-config/history — fee config version history from the Soroban contract.
 * Simulates a read-only call to OphirPayContract.get_fee_config_history().
 * Returns up to 100 version entries (capped by the contract).
 */
export async function GET() {
  try {
    const result = await simulateContractCall(
      DEFAULT_CONTRACT_ID,
      "get_fee_config_history",
      CHAIN_READ_SOURCE
    );

    if (result.status === "SIMULATION_FAILED") {
      return successResponse({ versions: [], available: false, error: result.error });
    }

    return successResponse(result.returnValue ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/fee-config/history");
  }
}
