import { logger } from "@/lib/logger";

/**
 * Application startup bootstrap.
 * Runs once on server start to validate configuration and initialize services.
 */
export async function bootstrap(): Promise<void> {
  const start = Date.now();

  logger.info("OphirPay starting up", { version: "0.1.0", nodeEnv: process.env.NODE_ENV });

  // Validate required environment variables
  const required = [
    "DATABASE_URL",
    "NEXT_PUBLIC_CONTRACT_ID",
    "NEXT_PUBLIC_EMITTER_CONTRACT_ID",
  ];

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
