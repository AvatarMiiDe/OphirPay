// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import { createPaymentSchema, paginationSchema } from "@/lib/validations";
import { successResponse, validationError, handleApiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { dispatchWebhookEventAsync } from "@/lib/webhook-dispatcher";
import { WEBHOOK_EVENTS } from "@/app/api/webhooks/event-types";
import { incMetric } from "@/lib/metrics-counters";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = paginationSchema.safeParse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status"),
      search: searchParams.get("search"),
    });

    if (!parsed.success) return validationError(parsed.error);

    const { page, limit, status, search } = parsed.data;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { memo: { contains: search } },
        { transactionHash: { contains: search } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    logger.request("GET", `/api/payments?page=${page}&limit=${limit}`, 200, 0);

    return successResponse(payments, { page, limit, total });
  } catch (err) {
    return handleApiError(err, "GET /api/payments");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const payment = await prisma.payment.create({
      data: {
        amount: parsed.data.amount,
        assetCode: parsed.data.assetCode,
        assetIssuer: parsed.data.assetIssuer,
        description: parsed.data.description,
        memo: parsed.data.memo,
        status: "CREATED",
        userId: parsed.data.sourceAccountId,
        sourceAccountId: parsed.data.sourceAccountId,
      },
    });

    logger.info("Payment created", { id: payment.id, amount: payment.amount });

    dispatchWebhookEventAsync(WEBHOOK_EVENTS.PAYMENT_CREATED, {
      paymentId: payment.id,
      amount: payment.amount,
      assetCode: payment.assetCode,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    });

    incMetric("payments_created_total");

    return successResponse(payment, undefined, 201);
  } catch (err) {
    return handleApiError(err, "POST /api/payments");
  }
}
