import prisma from "@/lib/prisma";
import { successResponse, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalPayments, statusAggregation] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.groupBy({
        by: ["status"],
        _count: { status: true },
        _sum: { amount: true },
      }),
    ]);

    const successful = statusAggregation.find((s) => s.status === "COMPLETED")?._count.status ?? 0;
    const failed = statusAggregation.find((s) => s.status === "FAILED")?._count.status ?? 0;
    const totalVolume = statusAggregation.reduce((sum, s) => sum + (s._sum.amount ?? 0), 0);

    // Volume by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPayments = await prisma.payment.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const volumeByDay: Record<string, { volume: number; count: number }> = {};
    for (const p of recentPayments) {
      const day = p.createdAt.toISOString().split("T")[0];
      if (!volumeByDay[day]) volumeByDay[day] = { volume: 0, count: 0 };
      volumeByDay[day].volume += p.amount;
      volumeByDay[day].count += 1;
    }

    return successResponse({
      totalPayments,
      totalVolume,
      successfulPayments: successful,
      failedPayments: failed,
      averageAmount: totalPayments > 0 ? totalVolume / totalPayments : 0,
      volumeByDay: Object.entries(volumeByDay).map(([date, v]) => ({
        date,
        volume: v.volume,
        count: v.count,
      })),
    });
  } catch {
    return serverError("Failed to compute analytics");
  }
}
