// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import { createWebhookSchema } from "@/lib/validations";
import { successResponse, badRequestError, handleApiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { withApiAuth } from "@/lib/api-auth";
import crypto from "crypto";

// ── GET /api/webhooks ─────────────────────────────────────────

const _GET = async () => {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: "desc" },
    });
    const safe = webhooks.map(({ secret, ...w }) => ({ ...w, hasSecret: !!secret }));
    return successResponse(safe);
  } catch (err) {
    return handleApiError(err, "GET /api/webhooks");
  }
};

// ── POST /api/webhooks ────────────────────────────────────────

const _POST = async (request: Request) => {
  try {
    const body = await request.json();
    const parsed = createWebhookSchema.safeParse(body);
    if (!parsed.success) return badRequestError("Invalid webhook data");

    const secret = crypto.randomBytes(32).toString("hex");

    const webhook = await prisma.webhook.create({
      data: {
        url: parsed.data.url,
        events: JSON.stringify(parsed.data.events),
        isActive: parsed.data.isActive,
        secret,
        userId: body.userId || "default",
      },
    });

    logger.info("Webhook created", { id: webhook.id, url: webhook.url });

    return successResponse({ ...webhook, secret }, undefined, 201);
  } catch (err) {
    return handleApiError(err, "POST /api/webhooks");
  }
};

// ── DELETE /api/webhooks?id=... ────────────────────────────────

const _DELETE = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequestError("Webhook ID is required");

    await prisma.webhook.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/webhooks");
  }
};

export const GET = withApiAuth(_GET);
export const POST = withApiAuth(_POST);
export const DELETE = withApiAuth(_DELETE);
