// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";

/**
 * GET /api/policy-versions — fee config + multisig config version history.
 * Reads from OphirPayContract.get_fee_config_history() and get_multisig_config_history().
 */
export async function GET() {
  try {
    const [feeResult, multisigResult] = await Promise.all([
      simulateContractCall(DEFAULT_CONTRACT_ID, "get_fee_config_history", CHAIN_READ_SOURCE),
      simulateContractCall(DEFAULT_CONTRACT_ID, "get_multisig_config_history", CHAIN_READ_SOURCE),
    ]);

    return successResponse({
      feeConfigHistory: feeResult.status === "SIMULATION_FAILED" ? [] : (feeResult.returnValue ?? []),
      multisigHistory: multisigResult.status === "SIMULATION_FAILED" ? [] : (multisigResult.returnValue ?? []),
    });
  } catch (err) {
    return handleApiError(err, "GET /api/policy-versions");
  }
}
