import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { PaymentStatus } from "@prisma/client";

// ── GET /api/batches — List all batches ─────────────────────

export async function GET() {
  try {
    const batches = await prisma.batch.findMany({
      include: {
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(batches);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 }
    );
  }
}

// ── POST /api/batches — Create a new batch ──────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, description, userId, payments } = body as {
      name: string;
      description?: string;
      userId: string;
      payments: {
        amount: number;
        assetCode?: string;
        description?: string;
        memo?: string;
        destAddress: string;
        transactionHash?: string;
        status?: string;
      }[];
    };

    if (!name || !userId || !payments?.length) {
      return NextResponse.json(
        { error: "name, userId, and payments are required" },
        { status: 400 }
      );
    }

    // Create the batch first
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
        description: p.description || "",
        memo: p.memo || "",
        transactionHash: p.transactionHash,
        status: (p.status as PaymentStatus) || "COMPLETED",
        userId,
        batchId: batch.id,
      })),
    });

    // Return the batch with its payments
    const result = await prisma.batch.findUnique({
      where: { id: batch.id },
      include: { payments: true },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create batch";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
