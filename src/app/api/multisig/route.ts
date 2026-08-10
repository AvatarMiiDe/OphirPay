// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";
import { setMultisigConfig } from "@/lib/contract-advanced";

/**
 * GET /api/multisig — current multisig configuration
 * Reads from the Soroban contract via OphirPayContract.get_multisig_config().
 */
export async function GET() {
  try {
    const result = await simulateContractCall(
      DEFAULT_CONTRACT_ID,
      "get_multisig_config",
      CHAIN_READ_SOURCE
    );

    if (result.status === "SIMULATION_FAILED") {
      return successResponse({
        threshold: 0,
        signers: [] as string[],
        enabled: false,
        source: "contract_unavailable",
      });
    }

    return successResponse(result.returnValue ?? {
      threshold: 0,
      signers: [],
      enabled: false,
    });
  } catch (err) {
    return handleApiError(err, "GET /api/multisig");
  }
}

/**
 * POST /api/multisig — configure multisig (owner-only, calls Soroban contract)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { caller, threshold, signers, enabled } = body;

    if (!caller) {
      return Response.json(
        { success: false, error: { code: "BAD_REQUEST", message: "caller (public key) is required" } },
        { status: 400 }
      );
    }

    const result = await setMultisigConfig(
      caller,
      threshold ?? 2,
      signers ?? [],
      enabled ?? false
    );

    if (!result.success) {
      return Response.json(
        { success: false, error: { code: "CONTRACT_ERROR", message: result.error } },
        { status: 400 }
      );
    }

    return successResponse({ txHash: result.txHash, ...body }, undefined, 200);
  } catch (err) {
    return handleApiError(err, "POST /api/multisig");
  }
}
