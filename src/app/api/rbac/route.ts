// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";

/**
 * GET /api/rbac — list role assignments from the Soroban contract.
 */
export async function GET() {
  try {
    // TODO: Replace with contract query: iterate role storage entries
    return successResponse([]);
  } catch (err) {
    return handleApiError(err, "GET /api/rbac");
  }
}
