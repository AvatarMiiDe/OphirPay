// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";

/**
 * GET /api/policy-versions — fee config + multisig config version history.
 */
export async function GET() {
  try {
    // TODO: Replace with contract.get_fee_config_history() + contract.get_multisig_config_history()
    return successResponse({ feeConfigHistory: [], multisigHistory: [] });
  } catch (err) {
    return handleApiError(err, "GET /api/policy-versions");
  }
}
