// SPDX-License-Identifier: MIT

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

// ── Health ─────────────────────────────────────────────────────

test.describe("GET /api/health", () => {
  test("returns 200 with service status", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.version).toBeDefined();
    expect(json.data.services.database.status).toBeDefined();
    expect(json.data.services.stellar).toBeDefined();
    expect(json.data.uptime).toBeGreaterThan(0);
  });
});

// ── Metrics ────────────────────────────────────────────────────

test.describe("GET /api/metrics", () => {
  test("returns Prometheus text format", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/metrics`);
    expect(res.status()).toBe(200);

    const text = await res.text();
    expect(text).toContain("ophirpay_http_requests_total");
    expect(text).toContain("ophirpay_payments_created_total");
    expect(text).toContain("ophirpay_info");
  });
});

// ── Pagination & Payments ──────────────────────────────────────

test.describe("GET /api/payments", () => {
  test("returns paginated payment list", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/payments?page=1&limit=10`);
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.meta.page).toBe(1);
    expect(json.meta.limit).toBe(10);
    expect(json.meta.timestamp).toBeDefined();
  });

  test("rejects invalid pagination params", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/payments?page=0&limit=500`);
    expect(res.status()).toBe(400);
  });
});

// ── Batches ────────────────────────────────────────────────────

test.describe("GET /api/batches", () => {
  test("returns 401 without auth", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/batches`, {
      data: { name: "Unauthed batch", recipients: [] },
    });
    expect(res.status()).toBe(401);
  });
});

// ── Webhooks (auth-gated) ─────────────────────────────────────

test.describe("GET /api/webhooks", () => {
  test("returns 401 without API key", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/webhooks`);
    expect(res.status()).toBe(401);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });
});

// ── API Keys (auth-gated) ──────────────────────────────────────

test.describe("GET /api/keys", () => {
  test("returns 401 without API key", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/keys`);
    expect(res.status()).toBe(401);
  });
});

// ── Recurring ──────────────────────────────────────────────────

test.describe("GET /api/recurring", () => {
  test("returns paginated recurring payments", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/recurring?page=1&limit=5`);
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── Analytics ──────────────────────────────────────────────────

test.describe("GET /api/analytics", () => {
  test("returns aggregated payment stats", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/analytics`);
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalPayments).toBeDefined();
    expect(json.data.successRate).toBeDefined();
  });
});

// ── Requests ───────────────────────────────────────────────────

test.describe("GET /api/requests", () => {
  test("returns payment requests list", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/requests`);
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });
});

// ── Hooks ──────────────────────────────────────────────────────

test.describe("GET /api/hooks", () => {
  test("returns notification hooks", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/hooks`);
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── Refunds ────────────────────────────────────────────────────

test.describe("GET /api/refunds", () => {
  test("returns refund list", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/refunds`);
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── CORS & Security Headers ────────────────────────────────────

test.describe("Security headers on API", () => {
  test("API returns security headers", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["referrer-policy"]).toBeDefined();
  });
});

// ── Not Found ──────────────────────────────────────────────────

test.describe("404 handling", () => {
  test("unknown API route returns proper error", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/nonexistent`);
    // Next.js returns 404 for unknown routes
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

// ── SSE Events ─────────────────────────────────────────────────

test.describe("GET /api/events", () => {
  test("returns SSE content type with connected event", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/events`, {
      timeout: 5000,
    });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/event-stream");
  });
});
