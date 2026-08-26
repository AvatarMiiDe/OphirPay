// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import {
  successResponse,
  badRequestError,
  unauthorizedError,
  handleApiError,
} from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-session";
import { verifyCsrf } from "@/lib/csrf";
import { validateBody, updateRefundStatusSchema } from "@/lib/validation-schemas";
import { validateIdParam } from "@/lib/validate-params";

// ── PATCH /api/refunds/[id] ───────────────────────────────────

/**
 * Update the lifecycle status of a refund ledger row AFTER the matching
 * on-chain transition (approve_refund / process_refund) succeeded, so the
 * Request → Approve → Process flow is reflected in the list.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const csrfError = verifyCsrf(request);
    if (csrfError) return csrfError;

    const auth = await getAuthContext(request);
    if (!auth) return unauthorizedError("Authentication required.");

    const idParsed = await validateIdParam(params);
    if (!idParsed.success) return idParsed.response;
    const { id } = idParsed;

    const bodyParsed = await validateBody(request, updateRefundStatusSchema);
    if (!bodyParsed.success) return bodyParsed.response;

    // Scoped update — only the owner can change their own refund row
    const result = await prisma.refund.updateMany({
      where: { id, userId: auth.userId },
      data: {
        status: bodyParsed.data.status,
        resolvedAt: new Date(),
      },
    });
    if (result.count === 0) return badRequestError("Refund not found");

    return successResponse({ updated: true });
  } catch (err) {
    return handleApiError(err, "PATCH /api/refunds/[id]");
  }
}