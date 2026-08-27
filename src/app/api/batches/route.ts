// SPDX-License-Identifier: MIT

import { successResponse, handleApiError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-session";
import { incMetric } from "@/lib/metrics-counters";
import { withRequestLogging } from "@/lib/request-logging";

// ── GET /api/batches — List batches with pagination ──────────

export const GET = withRequestLogging(async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError(
        "Authentication required. Connect your wallet or provide an API key."
      );
    }

    const parsed = await validateIdParam(params, "numeric");
    if (!parsed.success) return parsed.response;
    const { id } = parsed;
    const batchId = Number(id);

    const result = await simulateContractCall(
      DEFAULT_CONTRACT_ID,
      "get_batch",
      CHAIN_READ_SOURCE,
      [nativeToScVal(batchId, { type: "u64" })]
    );

    return successResponse(batches, {
      page,
      limit,
      total,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err, "GET /api/batches");
  }
});

// ── POST /api/batches — Create a new batch ──────────────────

export const POST = withRequestLogging(async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError(
        "Authentication required. Connect your wallet or provide an API key."
      );
    }

    const batch = result.returnValue as Record<string, unknown>;

    // Optionally include batch payments
    const { searchParams } = new URL(request.url);
    if (searchParams.get("payments") === "true") {
      const paymentsResult = await simulateContractCall(
        DEFAULT_CONTRACT_ID,
        "get_payments_by_batch",
        CHAIN_READ_SOURCE,
        [nativeToScVal(batchId, { type: "u64" })]
      );
      return successResponse({
        ...batch,
        payments: paymentsResult.status === "SIMULATION_FAILED" ? [] : paymentsResult.returnValue,
      });
    }

    return successResponse(batch);
  } catch (err) {
    return handleApiError(err, "GET /api/batches/[id]");
  }
});
