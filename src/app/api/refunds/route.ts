// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const analytics = searchParams.get("analytics") === "true";

  try {
    if (analytics) {
      const refunds = await prisma.refund.findMany({ select: { reasonCode: true } });
      const buckets = [0, 1, 2, 3, 4, 5].map((code) => ({
        code,
        count: refunds.filter((r) => r.reasonCode === code).length,
      }));
      return successResponse(buckets);
    }

    const refunds = await prisma.refund.findMany({
      orderBy: { requestedAt: "desc" },
      take: 50,
      select: {
        id: true,
        paymentId: true,
        amount: true,
        asset: true,
        reason: true,
        reasonCode: true,
        status: true,
        requestedAt: true,
        resolvedAt: true,
        userId: true,
      },
    });

    return successResponse(refunds);
  } catch (err) {
    return handleApiError(err, "GET /api/refunds");
  }
}
