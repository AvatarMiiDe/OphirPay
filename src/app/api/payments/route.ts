// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import { createPaymentSchema, paginationSchema } from "@/lib/validation-schemas";
import {
  successResponse,
  validationError,
  unauthorizedError,
  handleApiError,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { getAuthContext } from "@/lib/auth-session";
import { buildPaymentWhere } from "@/lib/payment-filters";
import { dispatchWebhookEventAsync } from "@/lib/webhook-dispatcher";
import { WEBHOOK_EVENTS } from "@/app/api/webhooks/event-types";
import { incMetric } from "@/lib/metrics-counters";

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError(
        "Authentication required. Connect your wallet or provide an API key."
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = paginationSchema.safeParse({
      // searchParams.get() returns null for absent params, which Zod's
      // .optional() rejects and z.coerce.number() turns into 0 (failing
      // .positive()) — normalize all of them to undefined so the defaults
      // apply. Without this, bare list requests (no filters) would 400.
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    if (!parsed.success) return validationError(parsed.error);

    const { page, limit, status, search } = parsed.data;

    // Always scope to the authenticated user — never expose other users' data.
    // The where clause is shared with GET /api/payments/export so the export
    // always reflects the exact same filter results as the list.
    const where = buildPaymentWhere(auth.userId, { status, search });

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
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError(
        "Authentication required. Connect your wallet or provide an API key."
      );
    }

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
        // The authenticated user owns the record; sourceAccountId is a
        // Stellar account reference, NOT the User FK (previously this
        // wrote a Stellar address into userId, breaking the relation).
        userId: auth.userId,
        sourceAccountId: parsed.data.sourceAccountId,
      },
    });

    logger.info("Payment created", { id: payment.id, amount: payment.amount });

    dispatchWebhookEventAsync(
      WEBHOOK_EVENTS.PAYMENT_CREATED,
      {
        paymentId: payment.id,
        amount: payment.amount,
        assetCode: payment.assetCode,
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
      },
      auth.userId
    );

    incMetric("payments_created_total");

    return successResponse(payment, undefined, 201);
  } catch (err) {
    return handleApiError(err, "POST /api/payments");
  }
}
