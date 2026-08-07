// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";

/**
 * GET /api/timelock — list pending timelocked actions from the Soroban contract.
 */
export async function GET() {
  try {
    // TODO: Replace with contract query: iterate timelock storage entries
    return successResponse([]);
  } catch (err) {
    return handleApiError(err, "GET /api/timelock");
  }
}
