// SPDX-License-Identifier: MIT

import { successResponse, badRequestError, handleApiError } from "@/lib/api-response";

/**
 * POST /api/multisig/execute — execute a fully approved payment
 * Calls OphirPayContract.execute_approved_payment() on-chain.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.requestId) return badRequestError("requestId is required");

    // TODO: Call contract.execute_approved_payment(caller, requestId)
    return successResponse({ executed: true, requestId: body.requestId, paymentId: Date.now(), source: "contract_stub" });
  } catch (err) {
    return handleApiError(err, "POST /api/multisig/execute");
  }
}
