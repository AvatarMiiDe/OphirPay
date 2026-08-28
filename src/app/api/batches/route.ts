// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import { createBatchSchema, paginationSchema } from "@/lib/validation-schemas";
import {
  successResponse,
  validationError,
  badRequestError,
  unauthorizedError,
  handleApiError,
} from "@/lib/api-response";
import { withRequestLogging } from "@/lib/request-logging";
import { getAuthContext } from "@/lib/auth-session";
import { incMetric } from "@/lib/metrics-counters";
import {
  buildCursorWhere,
  computeNextCursor,
  decodeCursor,
  prismaPagination,
} from "@/lib/pagination-utils";

// ── GET /api/batches — List batches with pagination ──────────

export const GET = withRequestLogging(async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError(
        "Authentication required. Connect your wallet or provide an API key."
      );
    }

    const { searchParams } = new URL(request.url);
    const explicitPage = searchParams.get("page");
    // `?? undefined` matters: searchParams.get() returns null for absent
    // params, and the schema's defaults/optionals only apply to undefined.
    const parsed = paginationSchema.safeParse({
      page: explicitPage ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    if (!parsed.success) return validationError(parsed.error);

    const { page, limit, status, search, cursor: rawCursor } = parsed.data;

    const baseWhere: Record<string, unknown> = { userId: auth.userId };
    if (status) baseWhere.status = status;
    if (search) {
      baseWhere.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Keyset (cursor) pagination is the default for plain list requests — it
    // never deep-skips, so later pages stay fast as the table grows. Offset
    // pagination via an explicit `page` param is kept for legacy consumers.
    const cursor = rawCursor ? decodeCursor(rawCursor) : null;
    if (rawCursor && !cursor) {
      return badRequestError("Invalid cursor");
    }

    const useCursor = cursor !== null || explicitPage === null;
    const where = buildCursorWhere(baseWhere, cursor);

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        include: { payments: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        // Fetch one extra row to learn whether another page exists.
        ...(useCursor ? { take: limit + 1 } : prismaPagination(page, limit)),
      }),
      prisma.batch.count({ where: baseWhere }),
    ]);

    const visible = useCursor ? batches.slice(0, limit) : batches;
    const pageInfo = useCursor
      ? computeNextCursor(batches, limit)
      : { nextCursor: null, hasMore: page * limit < total };

    return successResponse(visible, {
      page,
      limit,
      total,
      nextCursor: pageInfo.nextCursor,
      hasMore: pageInfo.hasMore,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err, "GET /api/batches");
  }
});

// ── POST /api/batches — Create a new batch (idempotent) ──────

const IDEMPOTENCY_HEADER = "Idempotency-Key";

/** True when `err` is a Prisma unique-constraint violation (P2002). */
function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  );
}

export const POST = withRequestLogging(async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError(
        "Authentication required. Connect your wallet or provide an API key."
      );
    }

    const body = await request.json();

    // The Idempotency-Key header takes precedence over the body field, so it
    // is resolved BEFORE body validation: a valid header must win even when
    // the lower-precedence body key is invalid (otherwise a client that
    // sends both would be rejected for a key it never intended to use). When
    // a header is present the body key is ignored entirely.
    const headerKey = request.headers.get(IDEMPOTENCY_HEADER);
    let idempotencyKey: string | null = null;
    let parsed;
    if (headerKey) {
      const parsedKey = idempotencyKeySchema.safeParse(headerKey);
      if (!parsedKey.success) {
        return validationError(parsedKey.error);
      }
      idempotencyKey = parsedKey.data;
      parsed = createBatchSchema.omit({ idempotencyKey: true }).safeParse(body);
    } else {
      parsed = createBatchSchema.safeParse(body);
    }
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    // Both parse paths produce a createBatchSchema-shaped payload; the omit
    // variant simply lacks idempotencyKey (which is already set above).
    const data = parsed.data as CreateBatchInput;
    const { name, description, recipients: payments } = data;
    const { userId } = auth;

    // No header supplied — fall back to the optional (already trimmed +
    // validated by createBatchSchema) body idempotencyKey field.
    if (idempotencyKey === null && data.idempotencyKey) {
      idempotencyKey = data.idempotencyKey;
    }

    // Replay: a previous request with the same key already created this
    // batch. Return the original instead of creating duplicates.
    if (idempotencyKey) {
      const existing = await prisma.batch.findFirst({
        where: { userId, idempotencyKey },
        include: { payments: true },
      });
      if (existing) {
        return successResponse(
          existing,
          { timestamp: new Date().toISOString(), deduplicated: true },
          200
        );
      }
    }

    try {
      // Batch + child payments are created atomically so a failure can never
      // leave a batch without its payments (or vice versa).
      const created = await prisma.$transaction(async (tx) => {
        const batch = await tx.batch.create({
          data: {
            name,
            description,
            userId,
            ...(idempotencyKey ? { idempotencyKey } : {}),
          },
        });

        // Create child payments — status is CREATED (not COMPLETED)
        await tx.payment.createMany({
          data: payments.map((p) => ({
            amount: p.amount,
            assetCode: p.assetCode || "XLM",
            memo: p.memo || "",
            status: "CREATED",
            userId,
            batchId: batch.id,
          })),
        });

        return batch;
      });

      const result = await prisma.batch.findUnique({
        where: { id: created.id },
        include: { payments: true },
      });

      incMetric("batches_processed_total");

      return successResponse(
        result,
        { timestamp: new Date().toISOString() },
        201
      );
    } catch (err) {
      // Concurrent duplicate: another request with the same key won the race
      // and the DB unique constraint rejected our insert. Return the winner
      // as a deduplicated replay rather than surfacing a 409 to the client.
      if (isUniqueConstraintError(err) && idempotencyKey) {
        const winner = await prisma.batch.findFirst({
          where: { userId, idempotencyKey },
          include: { payments: true },
        });
        if (winner) {
          return successResponse(
            winner,
            { timestamp: new Date().toISOString(), deduplicated: true },
            200
          );
        }
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err, "POST /api/batches");
  }
});
