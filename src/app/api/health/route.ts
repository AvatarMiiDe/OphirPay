// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import {
  STELLAR_NETWORK,
  SOROBAN_RPC_URL,
  HORIZON_URL,
} from "@/lib/stellar";
import { successResponse, serverError } from "@/lib/api-response";

// ── Check helpers ──────────────────────────────────────────────

type CheckStatus = "ok" | "error" | "unchecked" | "disabled" | "not_configured";

/** Stellar strkey formats used for contract/account presence validation. */
const CONTRACT_ID_RE = /^C[A-Z0-9]{55}$/;
const ACCOUNT_ID_RE = /^G[A-Z0-9]{55}$/;

/** GET a URL and report reachability + latency; null when it errors/times out. */
async function pingUrl(
  url: string,
  timeoutMs: number
): Promise<{ ok: boolean; latencyMs: number } | null> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** POST a JSON-RPC body and report reachability + latency; null on failure. */
async function pingJsonRpc(
  url: string,
  body: unknown,
  timeoutMs: number
): Promise<{ ok: boolean; latencyMs: number } | null> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Validate a configured contract/account ID against its strkey format. */
function checkIdPresence(
  id: string | undefined,
  format: RegExp
): { id: string | null; status: CheckStatus } {
  if (!id) return { id: null, status: "not_configured" };
  return { id, status: format.test(id) ? "ok" : "error" };
}

// ── Route ──────────────────────────────────────────────────────

export async function GET() {
  try {
    // Critical check: database connectivity
    let dbStatus: "ok" | "error" = "ok";
    let dbLatency: number | null = null;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = "error";
    }

    // Optional check: Soroban RPC reachability
    let rpcStatus: CheckStatus = "unchecked";
    let rpcLatency: number | null = null;
    const rpc = await pingJsonRpc(
      SOROBAN_RPC_URL,
      { jsonrpc: "2.0", id: 1, method: "getHealth" },
      5000
    );
    if (rpc) {
      rpcStatus = rpc.ok ? "ok" : "error";
      rpcLatency = rpc.latencyMs;
    } else {
      rpcStatus = "error";
    }

    // Optional check: Horizon reachability
    let horizonStatus: CheckStatus = "unchecked";
    let horizonLatency: number | null = null;
    const horizon = await pingUrl(HORIZON_URL, 5000);
    if (horizon) {
      horizonStatus = horizon.ok ? "ok" : "error";
      horizonLatency = horizon.latencyMs;
    } else {
      horizonStatus = "error";
    }

    // Optional check: Redis connectivity (only when configured)
    let redisStatus: CheckStatus = "disabled";
    let redisLatency: number | null = null;
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      const pingUrlStr =
        redisUrl.replace(/\/\/.*@/, "//health:@").replace(/\/\d+$/, "") +
        "/ping";
      const redis = await pingUrl(pingUrlStr, 3000);
      if (redis) {
        redisStatus = redis.ok ? "ok" : "error";
        redisLatency = redis.latencyMs;
      } else {
        redisStatus = "error";
      }
    }

    // Optional check: configured contract-ID presence + format
    const ophirpay = checkIdPresence(
      process.env.NEXT_PUBLIC_CONTRACT_ID,
      CONTRACT_ID_RE
    );
    const emitter = checkIdPresence(
      process.env.NEXT_PUBLIC_EMITTER_CONTRACT_ID,
      CONTRACT_ID_RE
    );
    const chainReadSource = checkIdPresence(
      process.env.NEXT_PUBLIC_CHAIN_READ_SOURCE,
      ACCOUNT_ID_RE
    );
    const contractsStatus: CheckStatus =
      ophirpay.status === "ok" &&
      emitter.status === "ok" &&
      chainReadSource.status !== "error"
        ? "ok"
        : "error";

    // Overall: down when the critical (DB) check fails, degraded when only
    // optional checks fail. Degraded still returns 200 so orchestration
    // probes keep the pod serving while the body reports the problem.
    const status =
      dbStatus !== "ok"
        ? "down"
        : rpcStatus !== "ok" ||
          horizonStatus !== "ok" ||
          redisStatus === "error" ||
          contractsStatus !== "ok"
          ? "degraded"
          : "ok";
    const httpStatus = status === "down" ? 503 : 200;

    return successResponse(
      {
        version: "0.1.0",
        status,
        services: {
          database: { status: dbStatus, latencyMs: dbLatency },
          redis: { status: redisStatus, latencyMs: redisLatency },
          stellar: {
            network: STELLAR_NETWORK,
            rpcUrl: SOROBAN_RPC_URL,
            horizonUrl: HORIZON_URL,
            rpc: { status: rpcStatus, latencyMs: rpcLatency },
            horizon: { status: horizonStatus, latencyMs: horizonLatency },
            contracts: {
              status: contractsStatus,
              ophirpay,
              emitter,
              chainReadSource,
            },
          },
        },
        uptime: process.uptime(),
      },
      { timestamp: new Date().toISOString() },
      httpStatus
    );
  } catch {
    return serverError("Health check failed");
  }
}
