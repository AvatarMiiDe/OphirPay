// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import {
  createBatchSchema,
  idempotencyKeySchema,
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

/**
 * Resolve the idempotency key for this request.
 *
 * The `Idempotency-Key` header takes precedence; otherwise the optional
 * (already trimmed + validated by `createBatchSchema`) `idempotencyKey`
 * body field is used. Returns null when the client sent no key at all.
 */
function resolveIdempotencyKey(
  request: Request,
  bodyKey?: string
): { key: string | null; error?: Response } {
  const headerKey = request.headers.get(IDEMPOTENCY_HEADER);
  if (headerKey) {
    const parsed = idempotencyKeySchema.safeParse(headerKey);
    if (!parsed.success) {
      return { key: null, error: validationError(parsed.error) };
    }
    return { key: parsed.data };
  }
  return { key: bodyKey ?? null };
}

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

    const parsed = createBatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { name, description, recipients: payments } = parsed.data;
    const { userId } = auth;

    const { key: idempotencyKey, error: keyError } = resolveIdempotencyKey(
      request,
      parsed.data.idempotencyKey
    );
    if (keyError) {
      return keyError;
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
