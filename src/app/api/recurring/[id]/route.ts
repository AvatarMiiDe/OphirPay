// SPDX-License-Identifier: MIT

import { successResponse, handleApiError, notFoundError } from "@/lib/api-response";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";

/**
 * GET /api/recurring/[id] — single recurring payment lookup
 * Reads from OphirPayContract on-chain.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recurringId = parseInt(id, 10);

    if (isNaN(recurringId)) {
      return notFoundError("Invalid recurring payment ID");
    }

    const result = await simulateContractCall(
      DEFAULT_CONTRACT_ID,
      "get_recurring",
      CHAIN_READ_SOURCE
    );

    if (result.status === "SIMULATION_FAILED" || !result.returnValue) {
      return notFoundError(`Recurring payment ${id} not found`);
    }

    return successResponse(result.returnValue);
  } catch (err) {
    return handleApiError(err, `GET /api/recurring/${await params.then(p => p.id)}`);
  }
}
