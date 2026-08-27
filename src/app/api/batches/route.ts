// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import {
  createBatchSchema,
  idempotencyKeySchema,
  type CreateBatchInput,
} from "@/lib/validation-schemas";
import {
  successResponse,
  validationError,
  unauthorizedError,
  handleApiError,
} from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-session";
import { incMetric } from "@/lib/metrics-counters";

// ── GET /api/batches — List batches with pagination ──────────

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return unauthorizedError(
        "Authentication required. Connect your wallet or provide an API key."
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { userId: auth.userId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        include: { payments: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.batch.count({ where }),
    ]);

    return successResponse(batches, {
      page,
      limit,
      total,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err, "GET /api/batches");
  }
}

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

export async function POST(request: Request) {
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
}
