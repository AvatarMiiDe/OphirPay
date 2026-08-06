// SPDX-License-Identifier: MIT

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createWebhookSchema } from "@/lib/validations";
import { successResponse, serverError, validationError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { withApiAuth } from "@/lib/api-auth";
import crypto from "crypto";

// ── GET /api/webhooks ─────────────────────────────────────────

const _GET = async () => {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: "desc" },
    });
    // Don't expose secrets in the list
    const safe = webhooks.map(({ secret, ...w }) => ({ ...w, hasSecret: !!secret }));
    return successResponse(safe);
  } catch {
    return serverError("Failed to fetch webhooks");
  }
}

// ── POST /api/webhooks ────────────────────────────────────────

const _POST = async (request: Request) => {
  try {
    const body = await request.json();
    const parsed = createWebhookSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

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

    // Return secret only on creation
    return successResponse({ ...webhook, secret }, undefined, 201);
  } catch (err) {
    logger.error("Failed to create webhook", { error: String(err) });
    return serverError("Failed to create webhook");
  }
}

// ── DELETE /api/webhooks?action=delete&id=... ─────────────────

const _DELETE = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return validationError(new Error("Webhook ID is required") as never);

    await prisma.webhook.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch {
    return serverError("Failed to delete webhook");
  }
}
export const GET = withApiAuth(_GET);
export const POST = withApiAuth(_POST);
export const DELETE = withApiAuth(_DELETE);
