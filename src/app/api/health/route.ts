// SPDX-License-Identifier: MIT

import prisma from "@/lib/prisma";
import { STELLAR_NETWORK, SOROBAN_RPC_URL } from "@/lib/stellar";
import { successResponse, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    // Check database connectivity
    let dbStatus: "ok" | "error" = "ok";
    let dbLatency: number | null = null;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = "error";
    }

    // Check Soroban RPC connectivity
    let rpcStatus: "ok" | "error" | "unchecked" = "unchecked";
    let rpcLatency: number | null = null;
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(SOROBAN_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      rpcLatency = Date.now() - start;
      rpcStatus = res.ok ? "ok" : "error";
    } catch {
      rpcStatus = "error";
    }

    const healthy = dbStatus === "ok";

    return successResponse(
      {
        version: "0.1.0",
        services: {
          database: { status: dbStatus, latencyMs: dbLatency },
          stellar: {
            network: STELLAR_NETWORK,
            rpcUrl: SOROBAN_RPC_URL,
            rpc: { status: rpcStatus, latencyMs: rpcLatency },
          },
        },
        uptime: process.uptime(),
      },
      { timestamp: new Date().toISOString() },
      healthy ? 200 : 503
    );
  } catch {
    return serverError("Health check failed");
  }
}
