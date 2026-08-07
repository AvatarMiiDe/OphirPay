// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";

/**
 * GET /api/fee-config — current fee configuration from the Soroban contract.
 */
export async function GET() {
  try {
    // TODO: Replace with contract.get_fee_config()
    return successResponse(null);
  } catch (err) {
    return handleApiError(err, "GET /api/fee-config");
  }
}
