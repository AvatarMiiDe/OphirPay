// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import {
  successResponse,
  badRequestError,
  unauthorizedError,
  handleApiError,
} from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-session";
import { webhookDeliveriesQuerySchema } from "@/lib/validation-schemas";

function formatDelivery(
  d: {
    id: string;
    eventId: string;
    status: string;
    responseCode: number | null;
    latencyMs: number | null;
    attempts: number;
    errorMessage: string | null;
    isReplay: boolean;
    replayBatchId: string | null;
    deliveredAt: Date;
    event: { event: string; timestamp: Date; data: string };
  },
) {
  return {
    id: d.id,
    eventId: d.eventId,
    eventType: d.event.event,
    eventTimestamp: d.event.timestamp.toISOString(),
    status: d.status,
    responseCode: d.responseCode,
    latencyMs: d.latencyMs,
    attempts: d.attempts,
    errorMessage: d.errorMessage,
    isReplay: d.isReplay,
    replayBatchId: d.replayBatchId,
    deliveredAt: d.deliveredAt.toISOString(),
    payload: {
      event: d.event.event,
      timestamp: d.event.timestamp.toISOString(),
      data: (() => {
        try {
          return JSON.parse(d.event.data) as Record<string, unknown>;
        } catch {
          return {};
        }
      })(),
    },
  };
}

/**
 * GET /api/webhooks/[id]/deliveries
 *
 * Returns delivery history with status, latency, attempts, and response code.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorizedError("Authentication required.");

    const { id } = await params;
    const webhook = await prisma.webhook.findFirst({
      where: { id, userId: auth.userId },
      select: { id: true },
    });
    if (!webhook) return badRequestError("Webhook not found");

    const { searchParams } = new URL(request.url);
    const parsed = webhookDeliveriesQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!parsed.success) {
      return badRequestError(parsed.error.issues.map((e) => e.message).join("; "));
    }

    const { limit } = parsed.data;

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId: webhook.id },
      orderBy: { deliveredAt: "desc" },
      take: limit,
      select: {
        id: true,
        eventId: true,
        status: true,
        responseCode: true,
        latencyMs: true,
        attempts: true,
        errorMessage: true,
        isReplay: true,
        replayBatchId: true,
        deliveredAt: true,
        event: {
          select: {
            event: true,
            timestamp: true,
            data: true,
          },
        },
      },
    });

    return successResponse(
      deliveries.map(formatDelivery),
      { limit, total: deliveries.length },
    );
  } catch (err) {
    return handleApiError(err, "GET /api/webhooks/[id]/deliveries");
  }
}
