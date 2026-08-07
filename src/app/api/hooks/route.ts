// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/api-response";

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

    return successResponse(hooks);
  } catch (err) {
    return handleApiError(err, "GET /api/hooks");
  }
}
