// SPDX-License-Identifier: MIT

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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
      return NextResponse.json({ data: buckets });
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

    return NextResponse.json({
      data: refunds.map((r) => ({
        id: parseInt(r.id.replace(/\D/g, "").slice(-8), 36) || r.id.charCodeAt(1),
        payment_id: r.paymentId,
        requester: r.userId,
        amount: Number(r.amount),
        asset: r.asset,
        reason: r.reason,
        reason_code: r.reasonCode,
        status: r.status,
        requested_at: Math.floor(new Date(r.requestedAt).getTime() / 1000),
        resolved_at: r.resolvedAt ? Math.floor(new Date(r.resolvedAt).getTime() / 1000) : 0,
      })),
    });
  } catch (err) {
    logger.error("Failed to fetch refunds", { error: String(err) });
    return NextResponse.json({ data: [] });
  }
}
