// SPDX-License-Identifier: MIT

import { logger } from "@/lib/logger";
import { incMetric } from "@/lib/metrics-counters";
import crypto from "crypto";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Generate HMAC-SHA256 signature for a webhook payload.
 * Receiving endpoints can verify authenticity by recomputing the signature.
 */
export function signWebhookPayload(payload: WebhookPayload, secret: string): string {
  const body = JSON.stringify(payload);
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Deliver a webhook event to a registered endpoint with retries and signing.
 * Returns true if delivery was successful (2xx response).
 */
export async function deliverWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload,
  maxRetries = 3
): Promise<boolean> {
  const signedPayload = {
    ...payload,
    signature: signWebhookPayload(payload, secret),
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OphirPay-Signature": signedPayload.signature,
          "X-OphirPay-Event": payload.event,
        },
        body: JSON.stringify(signedPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        logger.info("Webhook delivered", { url, event: payload.event, attempt });
        incMetric("webhooks_delivered_total");
        return true;
      }

      logger.warn("Webhook delivery failed", { url, status: response.status, attempt });
    } catch (err) {
      logger.warn("Webhook delivery error", { url, error: String(err), attempt });
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
    }
  }

  logger.error("Webhook delivery exhausted retries", { url, event: payload.event });
  incMetric("webhooks_failed_total");
  return false;
}
