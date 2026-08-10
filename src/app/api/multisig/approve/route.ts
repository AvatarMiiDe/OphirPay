// SPDX-License-Identifier: MIT

import { successResponse, badRequestError, handleApiError } from "@/lib/api-response";
import { approveMultisigPayment } from "@/lib/contract-advanced";

/**
 * POST /api/multisig/approve — signer approves a pending proposal
 * Calls OphirPayContract.approve_payment() on-chain.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { signer, requestId } = body;

    if (!signer || !requestId) {
      return badRequestError("signer and requestId are required");
    }

    const result = await approveMultisigPayment(signer, requestId);

    if (!result.success) {
      return Response.json(
        { success: false, error: { code: "CONTRACT_ERROR", message: result.error } },
        { status: 400 }
      );
    }

    return successResponse({ approved: true, requestId, txHash: result.txHash });
  } catch (err) {
    return handleApiError(err, "POST /api/multisig/approve");
  }
}
