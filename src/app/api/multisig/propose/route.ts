// SPDX-License-Identifier: MIT

import { successResponse, badRequestError, unauthorizedError, handleApiError } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-session";
import { proposeMultisigPayment } from "@/lib/contract-advanced";

/**
 * POST /api/multisig/propose — propose a payment for multisig approval
 * Calls OphirPayContract.propose_payment() on-chain.
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError(
        "Authentication required. Connect your wallet or provide an API key."
      );
    }

    const body = await request.json().catch(() => ({}));
    const { caller, payee, amount, asset, txHash } = body;

    if (!caller || !payee || !amount) {
      return badRequestError("caller, payee, and amount are required");
    }

    const result = await proposeMultisigPayment(
      caller,
      payee,
      amount,
      asset ?? "native",
      txHash ?? `multisig_${Date.now().toString(36)}`
    );

    if (!result.success) {
      return Response.json(
        { success: false, error: { code: "CONTRACT_ERROR", message: result.error } },
        { status: 400 }
      );
    }

    return successResponse({ txHash: result.txHash, proposalId: result.data }, undefined, 201);
  } catch (err) {
    return handleApiError(err, "POST /api/multisig/propose");
  }
}
