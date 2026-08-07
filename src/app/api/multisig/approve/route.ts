// SPDX-License-Identifier: MIT

import { successResponse, badRequestError, handleApiError } from "@/lib/api-response";

/**
 * POST /api/multisig/approve — signer approves a pending proposal
 * Calls OphirPayContract.approve_payment() on-chain.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.requestId) return badRequestError("requestId is required");

    // TODO: Call contract.approve_payment(signer, requestId)
    return successResponse({ approved: true, requestId: body.requestId, source: "contract_stub" });
  } catch (err) {
    return handleApiError(err, "POST /api/multisig/approve");
  }
}
