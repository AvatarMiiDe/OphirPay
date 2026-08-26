// SPDX-License-Identifier: MIT

import { successResponse, handleApiError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-session";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";
import { validateIdParam } from "@/lib/validate-params";
import { nativeToScVal } from "@stellar/stellar-sdk";

/**
 * GET /api/escrows/[id] — single escrow lookup
 * Reads from OphirPayContract on-chain.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError(
        "Authentication required. Connect your wallet or provide an API key."
      );
    }

    const parsed = await validateIdParam(params, "numeric");
    if (!parsed.success) return parsed.response;
    const { id } = parsed;
    const escrowId = Number(id);

    const result = await simulateContractCall(
      DEFAULT_CONTRACT_ID,
      "get_escrow",
      CHAIN_READ_SOURCE,
      [nativeToScVal(escrowId, { type: "u64" })]
    );

    if (result.status === "SIMULATION_FAILED" || !result.returnValue) {
      return notFoundError(`Escrow ${id} not found`);
    }

    return successResponse(result.returnValue);
  } catch (err) {
    return handleApiError(err, "GET /api/escrows/[id]");
  }
}