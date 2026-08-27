// SPDX-License-Identifier: MIT

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createPaymentSchema, paginationSchema } from "@/lib/validation-schemas";
import {
  successResponse,
  validationError,
  unauthorizedError,
  badRequestError,
  handleApiError,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { getAuthContext } from "@/lib/auth-session";
import { dispatchWebhookEventAsync } from "@/lib/webhook-dispatcher";
import { WEBHOOK_EVENTS } from "@/app/api/webhooks/event-types";
import { incMetric } from "@/lib/metrics-counters";
import {
  encodeCursor,
  decodeCursor,
  computePagination,
} from "@/lib/pagination-utils";

/**
 * GET /api/payments — list the authenticated user's payments.
 *
 * Two pagination modes:
 *
 * 1. Keyset (default) — `limit` + opaque `cursor` (base64url token). Rows are
 *    ordered `createdAt DESC, id DESC` and the next page continues from the
 *    last row of the previous page, so deep pages stay O(limit) and ordering
 *    is stable under concurrent inserts (no skipped/duplicated rows).
 *    Response meta: `{ limit, nextCursor, hasMore }`. Set `includeTotal=true`
 *    to also get `total` (an expensive COUNT — opt in only when needed).
 *
 * 2. Offset (legacy) — `page` + `limit` with a COUNT for `total`. Kept for
 *    backwards compatibility with clients of the documented offset contract
 *    (see docs/openapi.yaml).
 *
 * `cursor` and `page` are mutually exclusive.
 */
export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError(
        "Authentication required. Connect your wallet or provide an API key."
      );
    }

    const { searchParams } = new URL(request.url);
    const cursorRaw = searchParams.get("cursor");
    const pageRaw = searchParams.get("page");

    // `searchParams.get()` returns null for absent params; pass undefined so
    // the schema defaults apply instead of Zod rejecting null (zod v4).
    const parsed = paginationSchema.safeParse({
      page: pageRaw ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    if (!parsed.success) return validationError(parsed.error);

    const { page, limit, status, search } = parsed.data;

    if (cursorRaw && pageRaw) {
      return badRequestError(
        "Provide either `cursor` (keyset) or `page` (offset), not both."
      );
    }

    // Cursor is opaque and validated: decode + schema-check, reject garbage.
    const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
    if (cursorRaw && !cursor) {
      return badRequestError("Invalid pagination cursor.");
    }

    // Always scope to the authenticated user — never expose other users' data
    const baseConditions: Prisma.PaymentWhereInput[] = [
      { userId: auth.userId },
    ];
    if (status) baseConditions.push({ status });
    if (search) {
      baseConditions.push({
        OR: [
          { description: { contains: search } },
          { memo: { contains: search } },
          { transactionHash: { contains: search } },
        ],
      });
    }
    const baseWhere: Prisma.PaymentWhereInput = { AND: baseConditions };

    // ── Offset mode (legacy `page` param) ─────────────────────────
    if (pageRaw) {
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where: baseWhere,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.payment.count({ where: baseWhere }),
      ]);

      logger.request("GET", `/api/payments?page=${page}&limit=${limit}`, 200, 0);

      // computePagination already yields { page, limit, total, ... } for the
      // legacy offset contract — spread it to keep a single source of truth.
      return successResponse(payments, computePagination(page, limit, total));
    }

    // ── Keyset mode (default) ─────────────────────────────────────
    // Continue from the anchor row: strictly older createdAt, or same
    // createdAt with a smaller id — the (createdAt, id) tiebreak makes the
    // ordering total and stable under concurrent inserts.
    const keysetConditions = [...baseConditions];
    if (cursor) {
      keysetConditions.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          {
            createdAt: new Date(cursor.createdAt),
            id: { lt: cursor.id },
          },
        ],
      });
    }
    const keysetWhere: Prisma.PaymentWhereInput = { AND: keysetConditions };

    // Fetch one extra row to cheaply determine whether another page exists.
    const rows = await prisma.payment.findMany({
      where: keysetWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const payments = hasMore ? rows.slice(0, limit) : rows;
    const last = payments[payments.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null;

    // COUNT is O(matching rows) — opt in explicitly rather than paying for it
    // on every page (large accounts were timing out on the unconditional count).
    const includeTotal =
      searchParams.get("includeTotal") === "true" ||
      searchParams.get("includeTotal") === "1";
    const total = includeTotal
      ? await prisma.payment.count({ where: baseWhere })
      : undefined;

    logger.request(
      "GET",
      `/api/payments?limit=${limit}${cursor ? "&cursor=..." : ""}`,
      200,
      0
    );

    return successResponse(payments, {
      limit,
      nextCursor,
      hasMore,
      ...(includeTotal ? { total } : {}),
    });
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
