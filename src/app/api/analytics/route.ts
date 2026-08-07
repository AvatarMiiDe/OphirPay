// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/api-response";

/**
 * GET /api/analytics — Aggregated payment metrics
 */
export async function GET() {
  try {
    const [totalPayments, completedPayments, failedPayments, volumeResult] =
      await Promise.all([
        prisma.payment.count(),
        prisma.payment.count({ where: { status: "COMPLETED" } }),
        prisma.payment.count({ where: { status: "FAILED" } }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          _avg: { amount: true },
          where: { status: "COMPLETED" },
        }),
      ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyPayments = await prisma.payment.groupBy({
      by: ["createdAt"],
      _count: { id: true },
      _sum: { amount: true },
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: "COMPLETED",
      },
      orderBy: { createdAt: "asc" },
    });

    const volumeByDay = dailyPayments.map((d) => ({
      date: d.createdAt.toISOString().split("T")[0],
      volume: d._sum.amount ?? 0,
      count: d._count.id,
    }));

    return successResponse({
      totalPayments,
      completedPayments,
      failedPayments,
      totalVolume: volumeResult._sum.amount ?? 0,
      averageAmount: volumeResult._avg.amount ?? 0,
      successRate:
        totalPayments > 0
          ? Math.round((completedPayments / totalPayments) * 100)
          : 0,
      volumeByDay,
    });
  } catch (err) {
    return handleApiError(err, "GET /api/analytics");
  }
}
