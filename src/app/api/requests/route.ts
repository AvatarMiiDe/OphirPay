import prisma from "@/lib/prisma";
import { createPaymentRequestSchema } from "@/lib/validations";
import { successResponse, serverError, validationError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { dispatchWebhookEventAsync } from "@/lib/webhook-dispatcher";
import { WEBHOOK_EVENTS } from "@/app/api/webhooks/event-types";

export async function GET() {
  try {
    const requests = await prisma.paymentRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
    return successResponse(requests);
  } catch {
    return serverError("Failed to fetch payment requests");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createPaymentRequestSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const req = await prisma.paymentRequest.create({
      data: {
        amount: parsed.data.amount,
        assetCode: parsed.data.assetCode,
        assetIssuer: parsed.data.assetIssuer,
        description: parsed.data.description,
        recipientAddress: parsed.data.recipientAddress,
        userId: body.userId || "default",
      },
    });

    logger.info("Payment request created", { id: req.id, amount: req.amount });

    dispatchWebhookEventAsync(WEBHOOK_EVENTS.REQUEST_CREATED, {
      requestId: req.id,
      amount: req.amount,
      assetCode: req.assetCode,
      description: req.description,
      status: req.status,
      createdAt: req.createdAt.toISOString(),
    });

    return successResponse(req, undefined, 201);
  } catch (err) {
    logger.error("Failed to create payment request", { error: String(err) });
    return serverError("Failed to create payment request");
  }
}
