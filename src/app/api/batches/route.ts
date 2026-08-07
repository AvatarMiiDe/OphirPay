// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import type { PaymentStatus } from "@prisma/client";
import { createBatchSchema } from "@/lib/validations";
import { successResponse, serverError, validationError } from "@/lib/api-response";
import { requireAuth } from "@/lib/api-auth";

// ── GET /api/batches — List batches with pagination ──────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
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
  } catch {
    return serverError("Failed to fetch batches");
  }
}

// ── POST /api/batches — Create a new batch ──────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate with Zod
    const parsed = createBatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { name, description, recipients: payments } = parsed.data;

    // Authenticate via API key or wallet session
    const auth = await requireAuth(request);
    // If auth returned a Response (error), return it immediately in production
    if (!("userId" in auth)) {
      if (process.env.NODE_ENV === "production") {
        return auth;
      }
      // Dev: fall through with body-provided userId
    }

    const userId = ("userId" in auth) ? auth.userId : (body.userId || "dev-user");

    // Create the batch
    const batch = await prisma.batch.create({
      data: {
        name,
        description,
        userId,
      },
    });

    // Create payments linked to the batch and user
    await prisma.payment.createMany({
      data: payments.map((p) => ({
        amount: p.amount,
        assetCode: p.assetCode || "XLM",
        memo: p.memo || "",
        status: "COMPLETED" as PaymentStatus,
        userId,
        batchId: batch.id,
      })),
    });

    // Return the batch with its payments
    const result = await prisma.batch.findUnique({
      where: { id: batch.id },
      include: { payments: true },
    });

    return successResponse(result, { timestamp: new Date().toISOString() }, 201);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create batch";
    return serverError(message);
  }
}
