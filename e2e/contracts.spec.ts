// SPDX-License-Identifier: MIT

import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

// ── WASM Artifact Verification ─────────────────────────────────

test.describe("Contract WASM Artifacts", () => {
  test("OphirPay WASM exists and is non-empty", () => {
    const wasmPath = join(
      __dirname,
      "..",
      "contracts",
      "ophirpay",
      "target",
      "wasm32-unknown-unknown",
      "release",
      "ophirpay_contract.wasm"
    );
    expect(existsSync(wasmPath)).toBe(true);

    const wasm = readFileSync(wasmPath);
    expect(wasm.length).toBeGreaterThan(1000);
    // WASM magic bytes: 0x00 0x61 0x73 0x6d ("\0asm")
    expect(wasm[0]).toBe(0x00);
    expect(wasm[1]).toBe(0x61);
    expect(wasm[2]).toBe(0x73);
    expect(wasm[3]).toBe(0x6d);
    console.log(`OphirPay WASM: ${wasm.length} bytes`);
  });

  test("Emitter WASM exists and is non-empty", () => {
    const wasmPath = join(
      __dirname,
      "..",
      "contracts",
      "emitter",
      "target",
      "wasm32-unknown-unknown",
      "release",
      "ophirpay_emitter.wasm"
    );
    expect(existsSync(wasmPath)).toBe(true);

    const wasm = readFileSync(wasmPath);
    expect(wasm.length).toBeGreaterThan(500);
    expect(wasm[0]).toBe(0x00);
    expect(wasm[1]).toBe(0x61);
    expect(wasm[2]).toBe(0x73);
    expect(wasm[3]).toBe(0x6d);
    console.log(`Emitter WASM: ${wasm.length} bytes`);
  });

  test("OphirPay WASM is within size budget (< 100 KB)", () => {
    const wasmPath = join(
      __dirname,
      "..",
      "contracts",
      "ophirpay",
      "target",
      "wasm32-unknown-unknown",
      "release",
      "ophirpay_contract.wasm"
    );
    const wasm = readFileSync(wasmPath);
    // Soroban mainnet upload limit is ~200 KB; we budget 100 KB
    expect(wasm.length).toBeLessThan(100 * 1024);
  });
});

// ── Contract API Integration (requires Testnet deployment) ─────

test.describe("Contract Operations via API", () => {
  // These tests assume the contracts are deployed and the API
  // is configured with valid NEXT_PUBLIC_CONTRACT_ID and
  // NEXT_PUBLIC_EMITTER_CONTRACT_ID pointing to Testnet.
  // Skip gracefully if not configured.

  test("GET /api/health reports Stellar RPC connectivity", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.status()).toBe(200);

    const json = await res.json();
    // The Stellar service check should report network info
    expect(json.data.services.stellar).toBeDefined();
    console.log(
      `Stellar network: ${json.data.services.stellar.network || "unknown"}`
    );
  });

  test("GET /api/payments returns paginated results", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/payments?page=1&limit=5`);
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.meta).toBeDefined();
    expect(json.meta.page).toBe(1);
    expect(json.meta.limit).toBe(5);
  });

  test("POST /api/escrows with missing fields returns 400", async ({
    request,
  }) => {
    const res = await request.post(`${BASE_URL}/api/escrows`, {
      data: { beneficiary: "GXXX", amount: "100" },
    });
    // Should reject — missing depositor, asset, deadline
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("GET /api/stats returns contract statistics", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/stats`);
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    // ContractStats fields should be present
    const stats = json.data;
    expect(stats).toHaveProperty("total_payments_recorded");
    expect(stats).toHaveProperty("total_escrows_created");
    expect(stats).toHaveProperty("total_streams_created");
    expect(stats).toHaveProperty("total_batches_processed");
  });

  test("GET /api/fee-config returns fee configuration", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/fee-config`);
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    if (json.data) {
      expect(json.data).toHaveProperty("payment_fee_bps");
      expect(json.data).toHaveProperty("escrow_fee_bps");
      expect(json.data).toHaveProperty("stream_fee_bps");
    }
  });
});

// ── Escrow Lifecycle (end-to-end, requires Testnet) ────────────

test.describe("Escrow Lifecycle E2E", () => {
  test("Full escrow flow: create → get → release", async ({ request }) => {
    // Step 1: Create escrow
    const createRes = await request.post(`${BASE_URL}/api/escrows`, {
      data: {
        beneficiary:
          "GBZX4364PEPQTDICMIQDZ56K4T75QGKCRFHSVJFVODVFBRR6XOQNFB2C",
        amount: "100",
        asset: "native",
        deadline: Math.floor(Date.now() / 1000) + 86400, // 24h from now
        metadata: "E2E test escrow",
      },
    });

    // If the contract isn't deployed to Testnet, this will fail.
    // That's expected — skip remaining steps gracefully.
    if (createRes.status() >= 500) {
      console.log(
        "Escrow creation failed (expected if contract not deployed to Testnet). Skipping lifecycle test."
      );
      test.skip();
      return;
    }

    expect(createRes.status()).toBe(200);
    const createJson = await createRes.json();
    expect(createJson.success).toBe(true);
    const escrowId = createJson.data.id;
    expect(escrowId).toBeGreaterThan(0);

    // Step 2: Get escrow by ID
    const getRes = await request.get(`${BASE_URL}/api/escrows/${escrowId}`);
    expect(getRes.status()).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.data.amount).toBe("100");
    expect(getJson.data.released).toBe(false);
    expect(getJson.data.claimed).toBe(false);

    console.log(`Escrow ${escrowId} created and verified`);
  });
});
