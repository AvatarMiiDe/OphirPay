// SPDX-License-Identifier: MIT

import { successResponse, handleApiError, badRequestError } from "@/lib/api-response";
import { simulateContractCall, DEFAULT_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";

/**
 * GET /api/streams — list streams or fetch single by ?id=N
 * Reads from OphirPayContract on-chain.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const streamId = searchParams.get("id");

    if (streamId) {
      const result = await simulateContractCall(DEFAULT_CONTRACT_ID, "get_stream", CHAIN_READ_SOURCE);
      if (result.status === "SIMULATION_FAILED") {
        return successResponse({ available: false, error: result.error });
      }
      return successResponse(result.returnValue ?? null);
    }

    const countResult = await simulateContractCall(DEFAULT_CONTRACT_ID, "get_stream_count", CHAIN_READ_SOURCE);
    if (countResult.status === "SIMULATION_FAILED") {
      return successResponse({ count: 0, available: false });
    }
    return successResponse({ count: countResult.returnValue ?? 0 });
  } catch (err) {
    return handleApiError(err, "GET /api/streams");
  }
}

/**
 * POST /api/streams — create stream (requires wallet signing, delegates to client)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { creator, recipient, totalAmount, asset, startTime, endTime, metadata } = body;

    if (!creator || !recipient || !totalAmount) {
      return badRequestError("creator, recipient, and totalAmount are required");
    }

    return successResponse({
      message: "Stream creation requires wallet signing via the client-side createStream flow.",
      params: { creator, recipient, totalAmount, asset: asset ?? "native", startTime, endTime, metadata },
    }, undefined, 202);
  } catch (err) {
    return handleApiError(err, "POST /api/streams");
  }
}
