// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";

/**
 * GET /api/fee-config/history — fee config version history from the Soroban contract.
 */
export async function GET() {
  try {
    // TODO: Replace with contract.get_fee_config_history()
    return successResponse([]);
  } catch (err) {
    return handleApiError(err, "GET /api/fee-config/history");
  }
}
