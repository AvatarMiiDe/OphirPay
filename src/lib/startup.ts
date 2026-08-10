// SPDX-License-Identifier: MIT

import { logger } from "@/lib/logger";
import { validateEnv, getDatabaseProvider } from "@/lib/env";
import { initRateLimitStore } from "@/lib/rate-limit";

/**
 * Application startup bootstrap.
 * Runs once on server start to validate configuration and initialize services.
 */
export async function bootstrap(): Promise<void> {
  const start = Date.now();

  // Validate environment variables with Zod schema (fails fast with clear messages)
  try {
    const env = validateEnv();
    logger.info("OphirPay starting up", {
      version: "0.1.0",
      nodeEnv: env.NODE_ENV,
      database: env.DATABASE_PROVIDER,
      stellarNetwork: env.NEXT_PUBLIC_STELLAR_NETWORK,
      redis: env.REDIS_URL ? "configured" : "not configured",
    });
  } catch (error) {
    logger.error("Environment validation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    logger.warn(
      "Running with invalid env configuration in development mode — some features may not work"
    );
  }

  // Initialise rate-limit store (Redis if available, else in-memory)
  await initRateLimitStore();

  // PostgreSQL requires DIRECT_DATABASE_URL for migrations when pooling
  const dbProvider = getDatabaseProvider();
  if (dbProvider === "postgresql" && !process.env.DIRECT_DATABASE_URL) {
    logger.warn(
      "DIRECT_DATABASE_URL not set — connection pooling (e.g. Supabase/Neon) may need this for migrations"
    );
  }

  // Log stellar network configuration
  logger.info("Stellar network configuration", {
    network: process.env.NEXT_PUBLIC_STELLAR_NETWORK || "TESTNET",
    rpcUrl: process.env.NEXT_PUBLIC_STELLAR_RPC_URL || "default",
  });

  const duration = Date.now() - start;
  logger.info("Bootstrap complete", { durationMs: duration });
}
