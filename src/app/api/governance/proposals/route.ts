// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";

/**
 * GET /api/governance/proposals — list governance proposals
 * Reads from OphirPayContract.get_proposal() / get_proposal_count() on-chain.
 */
export async function GET() {
  try {
    // TODO: Read proposals from contract
    return successResponse([]);
  } catch (err) {
    return handleApiError(err, "GET /api/governance/proposals");
  }
}

/**
 * POST /api/governance/proposals — create a new proposal
 * Calls OphirPayContract.create_proposal() on-chain.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    // TODO: Call contract.create_proposal(proposer, title, description, action_type, target, data)
    return successResponse({ id: Date.now(), ...body }, undefined, 201);
  } catch (err) {
    return handleApiError(err, "POST /api/governance/proposals");
  }
}
