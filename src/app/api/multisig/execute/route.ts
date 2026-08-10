// SPDX-License-Identifier: MIT

import { successResponse, badRequestError, handleApiError } from "@/lib/api-response";
import { executeApprovedPayment } from "@/lib/contract-advanced";

/**
 * POST /api/multisig/execute — execute a fully approved payment
 * Calls OphirPayContract.execute_approved_payment() on-chain.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { caller, requestId } = body;

    if (!caller || !requestId) {
      return badRequestError("caller and requestId are required");
    }

    const result = await executeApprovedPayment(caller, requestId);

    if (!result.success) {
      return Response.json(
        { success: false, error: { code: "CONTRACT_ERROR", message: result.error } },
        { status: 400 }
      );
    }

    return successResponse({ executed: true, requestId, txHash: result.txHash });
  } catch (err) {
    return handleApiError(err, "POST /api/multisig/execute");
  }
}
