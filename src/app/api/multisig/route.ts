// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * GET /api/multisig — current multisig configuration
 *
 * Reads from the Soroban contract via OphirPayContract.get_multisig_config().
 * Falls back to a sensible default (disabled) when the contract is unreachable.
 */
export async function GET() {
  try {
    // TODO: Replace with contract call: contract.get_multisig_config()
    // For now, return a safe default — multisig disabled until configured on-chain.
    return successResponse({
      threshold: 0,
      signers: [] as string[],
      enabled: false,
      source: "contract_stub",
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
    // TODO: Call contract.set_multisig_config(caller, threshold, signers, enabled)
    return successResponse({
      threshold: body.threshold ?? 2,
      signers: body.signers ?? [],
      enabled: body.enabled ?? false,
      source: "contract_stub",
    }, undefined, 201);
  } catch (err) {
    return handleApiError(err, "POST /api/multisig");
  }
}
