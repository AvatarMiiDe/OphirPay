import { z } from "zod";

// ── Environment Variable Schema ─────────────────────────────────

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Stellar Network
  NEXT_PUBLIC_STELLAR_NETWORK: z.enum(["TESTNET", "PUBLIC"]).default("TESTNET"),
  NEXT_PUBLIC_STELLAR_RPC_URL: z.string().url().default("https://soroban-testnet.stellar.org:443"),
  NEXT_PUBLIC_STELLAR_HORIZON_URL: z.string().url().default("https://horizon-testnet.stellar.org"),
  STELLAR_NETWORK_PASSPHRASE: z.string().default("Test SDF Network ; September 2015"),

  // Soroban Contracts
  NEXT_PUBLIC_CONTRACT_ID: z.string().min(1, "NEXT_PUBLIC_CONTRACT_ID is required"),
  NEXT_PUBLIC_EMITTER_CONTRACT_ID: z.string().min(1, "NEXT_PUBLIC_EMITTER_CONTRACT_ID is required"),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Chain read source (public testnet account for simulation)
  NEXT_PUBLIC_CHAIN_READ_SOURCE: z.string().optional(),

  // Monitoring
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables at startup.
 * Call this once in a server-side context (e.g., next.config, instrumentation).
 * Returns the parsed config or throws on invalid configuration.
 *
 * @throws {Error} When required env vars are missing or invalid
 * @returns {Env} Validated environment configuration
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
      NEXT_PUBLIC_STELLAR_RPC_URL: process.env.NEXT_PUBLIC_STELLAR_RPC_URL,
      NEXT_PUBLIC_STELLAR_HORIZON_URL: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL,
      STELLAR_NETWORK_PASSPHRASE: process.env.STELLAR_NETWORK_PASSPHRASE,
      NEXT_PUBLIC_CONTRACT_ID: process.env.NEXT_PUBLIC_CONTRACT_ID,
      NEXT_PUBLIC_EMITTER_CONTRACT_ID: process.env.NEXT_PUBLIC_EMITTER_CONTRACT_ID,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_CHAIN_READ_SOURCE: process.env.NEXT_PUBLIC_CHAIN_READ_SOURCE,
      NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `  • ${e.path.join(".")}: ${e.message}`).join("\n");
      throw new Error(`Environment validation failed:\n${messages}`);
    }
    throw error;
  }
}

/**
 * Check if running in production mode.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Get the public app URL, with trailing slash removed.
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
