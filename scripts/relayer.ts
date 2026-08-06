/**
 * OphirPay Webhook Relayer
 * 
 * Polls Prisma for active notification hooks, then delivers webhook events
 * to registered subscriber URLs with HMAC-SHA256 signing.
 * 
 * Usage: npx tsx scripts/relayer.ts
 * 
 * Environment variables:
 *   POLL_INTERVAL_MS — polling interval in ms (default: 30000)
 */

import prisma from "@/lib/prisma";
import { deliverWebhook } from "@/lib/webhook-deliver";
import { logger } from "@/lib/logger";

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || "30000", 10);
const HOOK_SECRET = process.env.HOOK_SECRET || "ophirpay-dev-secret";

interface QueuedEvent {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Main relayer loop. Runs forever, polling every POLL_INTERVAL milliseconds.
 * In production, this should be replaced by event-driven delivery (SSE → enqueue).
 */
async function relayerLoop(): Promise<void> {
  logger.info("🔔 OphirPay Webhook Relayer started", { pollInterval: POLL_INTERVAL });

  // Track last-seen event timestamps per event type to avoid duplicate deliveries
  const lastDelivered: Record<string, number> = {};

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const hooks = await prisma.notificationHook.findMany({
        where: { active: true },
        select: { id: true, eventType: true, webhookUrl: true },
      });

      if (hooks.length === 0) {
        logger.debug("No active hooks — skipping poll cycle");
      }

      const now = Date.now();
      const events: QueuedEvent[] = [];

      // Collect events to deliver based on hook subscriptions
      for (const hook of hooks) {
        const lastTs = lastDelivered[hook.eventType] || 0;

        // Skip if we delivered recently (avoid spamming)
        if (now - lastTs < POLL_INTERVAL * 0.8) continue;

        // In production: query Soroban's get_audit_log_range for events since lastTs
        // For now: deliver a heartbeat confirming the hook is active
        events.push({
          event: hook.eventType,
          timestamp: new Date().toISOString(),
          data: {
            hookId: hook.id,
            eventType: hook.eventType,
            message: `Active hook — ${hook.eventType} subscription is registered on-chain`,
            deliveredAt: now,
          },
        });

        lastDelivered[hook.eventType] = now;
      }

      // Deliver events to matching hooks
      let delivered = 0;
      let failed = 0;

      for (const event of events) {
        const matchingHooks = hooks.filter((h) => h.eventType === event.event);

        for (const hook of matchingHooks) {
          const success = await deliverWebhook(hook.webhookUrl, HOOK_SECRET, event);
          if (success) {
            delivered++;
            logger.info("✅ Webhook delivered", {
              hookId: hook.id,
              event: event.event,
              url: hook.webhookUrl.substring(0, 40) + "...",
            });
          } else {
            failed++;
            logger.warn("❌ Webhook failed", {
              hookId: hook.id,
              event: event.event,
              url: hook.webhookUrl.substring(0, 40) + "...",
            });
          }
        }
      }

      if (delivered > 0 || failed > 0) {
        logger.info("📊 Relayer cycle complete", { delivered, failed, hooks: hooks.length });
      }
    } catch (err) {
      logger.error("Relayer cycle error", { error: String(err) });
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("🛑 Relayer shutting down");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("🛑 Relayer shutting down");
  process.exit(0);
});

relayerLoop().catch((err) => {
  logger.error("Relayer crashed", { error: String(err) });
  process.exit(1);
});
