import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get("event_type");

  try {
    const where = eventType ? { eventType, active: true } : {};

    const hooks = await prisma.notificationHook.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        userId: true,
        eventType: true,
        webhookUrl: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      data: hooks.map((h) => ({
        id: parseInt(h.id.replace(/\D/g, "").slice(-8), 36) || h.id.charCodeAt(1),
        subscriber: h.userId,
        event_type: h.eventType,
        webhook_url: h.webhookUrl,
        active: h.active,
        created_at: Math.floor(new Date(h.createdAt).getTime() / 1000),
      })),
    });
  } catch (err) {
    logger.error("Failed to fetch hooks", { error: String(err) });
    return NextResponse.json({ data: [] });
  }
}
