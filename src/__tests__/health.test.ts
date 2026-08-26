// SPDX-License-Identifier: MIT
// Tests for the expanded /api/health check — DB ping, Stellar RPC/Horizon
// reachability, Redis, and contract-ID presence, plus overall status
// (ok / degraded / down) semantics.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/health/route";
import { SOROBAN_RPC_URL, HORIZON_URL } from "@/lib/stellar";

const CONTRACT_ID = "C" + "A".repeat(55);
const EMITTER_CONTRACT_ID = "C" + "B".repeat(55);
const CHAIN_READ_SOURCE = "G" + "C".repeat(55);

const prismaMock = vi.hoisted(() => ({ $queryRaw: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));

function okResponse() {
  return new Response(null, { status: 200 });
}

/** Build a fetch stub whose per-endpoint outcome is controllable. */
function makeFetch({
  rpcOk = true,
  horizonOk = true,
  redisOk = true,
}: { rpcOk?: boolean; horizonOk?: boolean; redisOk?: boolean } = {}) {
  return vi.fn(async (url: unknown, init?: RequestInit) => {
    const urlStr = String(url);
    const isPost = (init?.method ?? "GET").toUpperCase() === "POST";
    if (isPost) {
      return rpcOk ? okResponse() : new Response(null, { status: 500 });
    }
    if (urlStr.includes("/ping")) {
      return redisOk ? okResponse() : new Response(null, { status: 500 });
    }
    return horizonOk ? okResponse() : new Response(null, { status: 500 });
  });
}

async function dataOf(res: Response) {
  const json = await res.json();
  return { status: res.status, data: json.data };
}

beforeEach(() => {
  prismaMock.$queryRaw.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", makeFetch());
  process.env.NEXT_PUBLIC_CONTRACT_ID = CONTRACT_ID;
  process.env.NEXT_PUBLIC_EMITTER_CONTRACT_ID = EMITTER_CONTRACT_ID;
  process.env.NEXT_PUBLIC_CHAIN_READ_SOURCE = CHAIN_READ_SOURCE;
  delete process.env.REDIS_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("GET /api/health", () => {
  it("reports ok with HTTP 200 when every check passes", async () => {
    const { status, data } = await dataOf(await GET());
    expect(status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.version).toBe("0.1.0");
    expect(data.uptime).toBeGreaterThan(0);

    expect(data.services.database.status).toBe("ok");
    expect(typeof data.services.database.latencyMs).toBe("number");

    expect(data.services.redis.status).toBe("disabled"); // no REDIS_URL

    expect(data.services.stellar.network).toBeDefined();
    expect(data.services.stellar.rpcUrl).toBe(SOROBAN_RPC_URL);
    expect(data.services.stellar.horizonUrl).toBe(HORIZON_URL);
    expect(data.services.stellar.rpc.status).toBe("ok");
    expect(data.services.stellar.horizon.status).toBe("ok");

    expect(data.services.stellar.contracts.status).toBe("ok");
    expect(data.services.stellar.contracts.ophirpay).toEqual({
      id: CONTRACT_ID,
      status: "ok",
    });
    expect(data.services.stellar.contracts.emitter).toEqual({
      id: EMITTER_CONTRACT_ID,
      status: "ok",
    });
  });

  it("reports down with HTTP 503 when the database check fails", async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error("connection refused"));
    const { status, data } = await dataOf(await GET());
    expect(status).toBe(503);
    expect(data.status).toBe("down");
    expect(data.services.database.status).toBe("error");
    expect(data.services.database.latencyMs).toBeNull();
  });

  it("reports degraded with HTTP 200 when only the RPC check fails", async () => {
    vi.stubGlobal("fetch", makeFetch({ rpcOk: false }));
    const { status, data } = await dataOf(await GET());
    expect(status).toBe(200);
    expect(data.status).toBe("degraded");
    expect(data.services.stellar.rpc.status).toBe("error");
    // Other optional checks still report their real state
    expect(data.services.stellar.horizon.status).toBe("ok");
    expect(data.services.database.status).toBe("ok");
  });

  it("reports degraded when the RPC endpoint is unreachable (fetch throws)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown, init?: RequestInit) => {
        const isPost = (init?.method ?? "GET").toUpperCase() === "POST";
        if (isPost) throw new Error("network unreachable");
        return okResponse();
      })
    );
    const { status, data } = await dataOf(await GET());
    expect(status).toBe(200);
    expect(data.status).toBe("degraded");
    expect(data.services.stellar.rpc.status).toBe("error");
    expect(data.services.stellar.rpc.latencyMs).toBeNull();
  });

  it("reports degraded with HTTP 200 when only the Horizon check fails", async () => {
    vi.stubGlobal("fetch", makeFetch({ horizonOk: false }));
    const { status, data } = await dataOf(await GET());
    expect(status).toBe(200);
    expect(data.status).toBe("degraded");
    expect(data.services.stellar.horizon.status).toBe("error");
    expect(data.services.stellar.rpc.status).toBe("ok");
  });

  it("reports degraded when Redis is configured but unreachable", async () => {
    process.env.REDIS_URL = "redis://default:secret@cache.example.com:6379/0";
    vi.stubGlobal("fetch", makeFetch({ redisOk: false }));
    const { status, data } = await dataOf(await GET());
    expect(status).toBe(200);
    expect(data.status).toBe("degraded");
    expect(data.services.redis.status).toBe("error");
  });

  it("stays ok when Redis is configured and reachable", async () => {
    process.env.REDIS_URL = "redis://default:secret@cache.example.com:6379/0";
    const { status, data } = await dataOf(await GET());
    expect(status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.services.redis.status).toBe("ok");
  });

  it("reports degraded when a required contract ID is missing", async () => {
    delete process.env.NEXT_PUBLIC_CONTRACT_ID;
    const { status, data } = await dataOf(await GET());
    expect(status).toBe(200);
    expect(data.status).toBe("degraded");
    expect(data.services.stellar.contracts.status).toBe("error");
    expect(data.services.stellar.contracts.ophirpay).toEqual({
      id: null,
      status: "not_configured",
    });
  });

  it("reports degraded when a contract ID is malformed", async () => {
    process.env.NEXT_PUBLIC_EMITTER_CONTRACT_ID = "not-a-contract-id";
    const { status, data } = await dataOf(await GET());
    expect(status).toBe(200);
    expect(data.status).toBe("degraded");
    expect(data.services.stellar.contracts.status).toBe("error");
    expect(data.services.stellar.contracts.emitter.status).toBe("error");
  });

  it("treats a missing chain read source as optional (not_configured, still ok)", async () => {
    delete process.env.NEXT_PUBLIC_CHAIN_READ_SOURCE;
    const { status, data } = await dataOf(await GET());
    expect(status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.services.stellar.contracts.status).toBe("ok");
    expect(data.services.stellar.contracts.chainReadSource).toEqual({
      id: null,
      status: "not_configured",
    });
  });
});
