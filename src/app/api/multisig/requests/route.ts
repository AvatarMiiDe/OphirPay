// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";

/**
 * GET /api/multisig/requests — list pending approval requests
 * Reads from OphirPayContract.get_approval_request() on-chain.
 */
export async function GET() {
  try {
    // TODO: Iterate contract approval requests and return them
    return successResponse([]);
  } catch (err) {
    return handleApiError(err, "GET /api/multisig/requests");
  }
}
