// SPDX-License-Identifier: MIT

import { successResponse, badRequestError, handleApiError } from "@/lib/api-response";

/**
 * POST /api/multisig/propose — propose a payment for multisig approval
 * Calls OphirPayContract.propose_payment() on-chain.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.payee || !body.amount) return badRequestError("payee and amount are required");

    // TODO: Call contract.propose_payment(proposer, payee, amount, asset, tx_hash)
    return successResponse({ id: Date.now(), ...body, source: "contract_stub" }, undefined, 201);
  } catch (err) {
    return handleApiError(err, "POST /api/multisig/propose");
  }
}
