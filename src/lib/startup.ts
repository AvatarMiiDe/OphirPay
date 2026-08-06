import { logger } from "@/lib/logger";
import { getDatabaseProvider } from "@/lib/env";

/**
 * Application startup bootstrap.
 * Runs once on server start to validate configuration and initialize services.
 */
export async function bootstrap(): Promise<void> {
  const start = Date.now();

  const dbProvider = getDatabaseProvider();

  logger.info("OphirPay starting up", {
    version: "0.1.0",
    nodeEnv: process.env.NODE_ENV,
    database: dbProvider,
  });

  // Validate required environment variables
  const required = [
    "DATABASE_URL",
    "NEXT_PUBLIC_CONTRACT_ID",
    "NEXT_PUBLIC_EMITTER_CONTRACT_ID",
  ];

  // PostgreSQL requires DIRECT_DATABASE_URL for migrations when pooling
  if (dbProvider === "postgresql" && !process.env.DIRECT_DATABASE_URL) {
    logger.warn(
      "DIRECT_DATABASE_URL not set — connection pooling (e.g. Supabase/Neon) may need this for migrations"
    );
  }

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error("Missing required environment variables", { missing });
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing env vars: ${missing.join(", ")}`);
    }
    logger.warn(
      "Running with missing env vars in development mode — some features may not work"
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
