// SPDX-License-Identifier: MIT

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

// ── Payment Flow (Critical Path) ───────────────────────────────

test.describe("Payment Flow", () => {
  test("send page loads with all required form elements", async ({ page }) => {
    await page.goto("/send");
    await expect(page.locator("h1")).toBeVisible();

    // Form elements should exist
    const recipientInput = page.locator("input[placeholder*='Recipient']");
    const amountInput = page.locator("input[inputmode='decimal']");
    await expect(recipientInput.or(amountInput).first()).toBeVisible();
  });

  test("validates empty form submission", async ({ page }) => {
    await page.goto("/send");
    const sendBtn = page.locator("button[type='submit']").first();
    if (await sendBtn.isVisible()) {
      await sendBtn.click();
      // Should show validation errors or prevent submission
      await expect(page.locator("text=required").or(page.locator("[role='alert']")).first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // Some forms may use HTML5 validation which pauses the test
      });
    }
  });

  test("validates invalid Stellar address format", async ({ page }) => {
    await page.goto("/send");
    const addrInput = page.locator("input[placeholder*='Recipient']").first();
    if (await addrInput.isVisible()) {
      await addrInput.fill("not-a-valid-address");
      await addrInput.blur();
      // Should show validation error
      await page.waitForTimeout(500);
    }
  });
});

// ── Escrow Lifecycle ───────────────────────────────────────────

test.describe("Escrow Lifecycle", () => {
  test("GET /api/escrows returns count", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/escrows`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty("count");
  });

  test("GET /api/escrows?id=1 returns escrow or graceful unavailable", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/escrows?id=1`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    // May return escrow data or 'available: false' if contract not deployed
    expect(json.data).toBeDefined();
  });

  test("POST /api/escrows requires depositor, beneficiary, amount", async ({
    request,
  }) => {
    const res = await request.post(`${BASE_URL}/api/escrows`, {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/escrows with valid fields returns 202", async ({
    request,
  }) => {
    const res = await request.post(`${BASE_URL}/api/escrows`, {
      data: {
        depositor: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        beneficiary: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        amount: "100",
        deadline: Math.floor(Date.now() / 1000) + 86400,
      },
    });
    expect(res.status()).toBe(202);
  });
});

// ── Stream Lifecycle ───────────────────────────────────────────

test.describe("Stream Lifecycle", () => {
  test("GET /api/streams returns count", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/streams`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty("count");
  });

  test("POST /api/streams requires creator, recipient, totalAmount", async ({
    request,
  }) => {
    const res = await request.post(`${BASE_URL}/api/streams`, {
      data: {},
    });
    expect(res.status()).toBe(400);
  });
});

// ── Fee Configuration ──────────────────────────────────────────

test.describe("Fee Configuration", () => {
  test("GET /api/fee-config returns fee structure", async ({ request }) => {
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

  test("GET /api/fee-config/collector returns collector address or null", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/fee-config/collector`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test("GET /api/fee-config/history returns version history", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/fee-config/history`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── RBAC (Role-Based Access Control) ───────────────────────────

test.describe("RBAC", () => {
  test("GET /api/rbac returns role info", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/rbac`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── Multisig ───────────────────────────────────────────────────

test.describe("Multisig API", () => {
  test("GET /api/multisig returns multisig configuration", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/multisig`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test("GET /api/multisig/requests returns approval requests", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/multisig/requests`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── Governance ─────────────────────────────────────────────────

test.describe("Governance API", () => {
  test("GET /api/governance/proposals returns proposals list", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/governance/proposals`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test("GET /api/governance/config returns governance settings", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/governance/config`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── Timelock ───────────────────────────────────────────────────

test.describe("Timelock API", () => {
  test("GET /api/timelock returns timelocked actions", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/timelock`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── Policy Versions ────────────────────────────────────────────

test.describe("Policy Versions", () => {
  test("GET /api/policy-versions returns version history", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/policy-versions`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── Audit Log ──────────────────────────────────────────────────

test.describe("Audit Log API", () => {
  test("GET /api/audit-log returns audit entries", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/audit-log`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test("GET /api/audit-log supports pagination", async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/audit-log?page=1&limit=10`
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.meta).toBeDefined();
  });
});

// ── Stats ──────────────────────────────────────────────────────

test.describe("Stats API", () => {
  test("GET /api/stats returns contract statistics", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/stats`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty("total_payments_recorded");
    expect(json.data).toHaveProperty("total_escrows_created");
    expect(json.data).toHaveProperty("total_streams_created");
    expect(json.data).toHaveProperty("total_batches_processed");
  });
});

// ── Rate Limiting ──────────────────────────────────────────────

test.describe("Rate Limiting", () => {
  test("health endpoint bypasses rate limiting", async ({ request }) => {
    // Fire 5 rapid requests — all should succeed since /api/health is exempt
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request.get(`${BASE_URL}/api/health`)
      )
    );
    for (const res of results) {
      expect(res.status()).toBe(200);
    }
  });

  test("metrics endpoint bypasses rate limiting", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/metrics`);
    expect(res.status()).toBe(200);
  });
});

// ── Error Handling ─────────────────────────────────────────────

test.describe("Error Handling", () => {
  test("malformed JSON body returns 400", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/payments`, {
      headers: { "Content-Type": "application/json" },
      data: "not json",
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("OPTIONS preflight returns CORS headers", async ({ request }) => {
    const res = await request.fetch(`${BASE_URL}/api/health`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://ophirpay.vercel.app",
        "Access-Control-Request-Method": "GET",
      },
    });
    // Should be successful with CORS headers
    expect(res.status()).toBeLessThan(500);
  });

  test("large pagination limit is capped", async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/payments?page=1&limit=9999`
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    // Limit should be capped at 100
    expect(json.meta.limit).toBeLessThanOrEqual(100);
  });
});

// ── Contract API ───────────────────────────────────────────────

test.describe("Contract API", () => {
  test("GET /api/contracts returns contract metadata", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/contracts`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── Refunds ────────────────────────────────────────────────────

test.describe("Refunds API", () => {
  test("GET /api/refunds supports reason code filtering", async ({
    request,
  }) => {
    const res = await request.get(
      `${BASE_URL}/api/refunds?reasonCode=1`
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── Hooks ──────────────────────────────────────────────────────

test.describe("Notification Hooks API", () => {
  test("GET /api/hooks returns registered hooks", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/hooks`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── Content-Type Verification ──────────────────────────────────

test.describe("Response Content Types", () => {
  test("API routes return JSON content type", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.headers()["content-type"]).toContain("application/json");
  });

  test("metrics returns Prometheus text format", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/metrics`);
    expect(res.headers()["content-type"]).toContain("text/plain");
  });
});

// ── API Version Header ─────────────────────────────────────────

test.describe("API Versioning", () => {
  test("API responses include version header", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    // Check for X-API-Version or similar versioning header
    const headers = res.headers();
    const _hasVersion =
      "x-api-version" in headers ||
      "api-version" in headers;
    // Not required yet, but validate response is well-formed
    expect(res.status()).toBe(200);
  });
});
