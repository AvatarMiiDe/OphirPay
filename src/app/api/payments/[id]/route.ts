// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import { successResponse, serverError, notFoundError } from "@/lib/api-response";
import { handlePrismaError } from "@/lib/prisma-errors";
import { logger } from "@/lib/logger";
import { dispatchWebhookEventAsync } from "@/lib/webhook-dispatcher";
import { WEBHOOK_EVENTS } from "@/app/api/webhooks/event-types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return notFoundError("Payment");
    return successResponse(payment);
  } catch (err) {
    return serverError(handlePrismaError(err).message);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as { status?: string; description?: string; memo?: string };

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status as never }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.memo !== undefined && { memo: body.memo }),
      },
    });

    logger.info("Payment updated", { id, status: payment.status });

    // Fire webhook on status transitions — non-blocking
    if (body.status === "COMPLETED") {
      dispatchWebhookEventAsync(WEBHOOK_EVENTS.PAYMENT_COMPLETED, {
        paymentId: payment.id,
        amount: payment.amount,
        assetCode: payment.assetCode,
        transactionHash: payment.transactionHash,
        completedAt: payment.completedAt?.toISOString() ?? new Date().toISOString(),
      });
    } else if (body.status === "FAILED") {
      dispatchWebhookEventAsync(WEBHOOK_EVENTS.PAYMENT_FAILED, {
        paymentId: payment.id,
        amount: payment.amount,
        assetCode: payment.assetCode,
        errorMessage: payment.errorMessage,
        failedAt: new Date().toISOString(),
      });
    }

    return successResponse(payment);
  } catch (err) {
    const errorResp = handlePrismaError(err);
    return serverError(errorResp.message);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.payment.delete({ where: { id } });
    logger.info("Payment deleted", { id });
    return successResponse({ deleted: true });
  } catch (err) {
    return serverError(handlePrismaError(err).message);
  }
}
