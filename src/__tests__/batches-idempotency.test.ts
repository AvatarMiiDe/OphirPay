// SPDX-License-Identifier: MIT
// Tests for idempotent batch creation — POST /api/batches with an
// Idempotency-Key header or body idempotencyKey field must never create
// duplicate batches/payments on retry.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    batch: { create: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    payment: { createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth-session", () => ({
  getAuthContext: vi.fn(),
}));

vi.mock("@/lib/metrics-counters", () => ({
  incMetric: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-session";
import { POST } from "@/app/api/batches/route";

const ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const VALID_BODY = {
  name: "Test Batch",
  recipients: [{ address: ADDRESS, amount: 10 }],
  sourceAccountId: "acc-1",
};

const VALID_HEADER_KEY = "batch-key-12345";
const VALID_BODY_KEY = "body-key-12345";

function makeRequest(body: unknown = VALID_BODY, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function p2002(message = "Unique constraint failed") {
  return Object.assign(new Error(message), { code: "P2002" });
}

const prismaMock = prisma as unknown as {
  batch: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  payment: { createMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("POST /api/batches — idempotency", () => {
  beforeEach(() => {
    // resetAllMocks (not clearAllMocks) also drains once-queues from
    // mockRejectedValueOnce/mockResolvedValueOnce so no state leaks between
    // tests.
    vi.resetAllMocks();
    vi.mocked(getAuthContext).mockResolvedValue({ userId: "user-1" } as never);

    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock)
    );
    prismaMock.batch.create.mockResolvedValue({
      id: "batch-1",
      userId: "user-1",
      name: VALID_BODY.name,
      idempotencyKey: null,
    });
    prismaMock.payment.createMany.mockResolvedValue({ count: 1 });
    prismaMock.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      userId: "user-1",
      name: VALID_BODY.name,
      idempotencyKey: null,
      payments: [{ id: "p-1", amount: 10, status: "CREATED" }],
    });
    prismaMock.batch.findFirst.mockResolvedValue(null);
  });

  it("creates a batch with its child payments when no key is supplied", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.meta.deduplicated).toBeUndefined();
    expect(prismaMock.batch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: VALID_BODY.name,
          userId: "user-1",
        }),
      })
    );
    // Unkeyed batches must NOT pass idempotencyKey into the create.
    const createData = prismaMock.batch.create.mock.calls[0][0].data;
    expect(createData.idempotencyKey).toBeUndefined();
    expect(prismaMock.payment.createMany).toHaveBeenCalledTimes(1);
  });

  it("accepts an Idempotency-Key header and stores it", async () => {
    const res = await POST(
      makeRequest(VALID_BODY, { "Idempotency-Key": VALID_HEADER_KEY })
    );
    expect(res.status).toBe(201);

    const createData = prismaMock.batch.create.mock.calls[0][0].data;
    expect(createData.idempotencyKey).toBe(VALID_HEADER_KEY);
  });

  it("accepts an idempotencyKey body field and stores it", async () => {
    const res = await POST(
      makeRequest({ ...VALID_BODY, idempotencyKey: VALID_BODY_KEY })
    );
    expect(res.status).toBe(201);

    const createData = prismaMock.batch.create.mock.calls[0][0].data;
    expect(createData.idempotencyKey).toBe(VALID_BODY_KEY);
  });

  it("gives the header key precedence over the body key", async () => {
    const res = await POST(
      makeRequest({ ...VALID_BODY, idempotencyKey: VALID_BODY_KEY }, {
        "Idempotency-Key": VALID_HEADER_KEY,
      })
    );
    expect(res.status).toBe(201);

    const createData = prismaMock.batch.create.mock.calls[0][0].data;
    expect(createData.idempotencyKey).toBe(VALID_HEADER_KEY);
  });

  it("replays a processed key by returning the original batch (no duplicates)", async () => {
    const existing = {
      id: "batch-1",
      userId: "user-1",
      name: VALID_BODY.name,
      idempotencyKey: VALID_HEADER_KEY,
      payments: [{ id: "p-1", amount: 10, status: "CREATED" }],
    };
    prismaMock.batch.findFirst.mockResolvedValue(existing);

    const res = await POST(
      makeRequest(VALID_BODY, { "Idempotency-Key": VALID_HEADER_KEY })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.meta.deduplicated).toBe(true);
    expect(json.data.id).toBe("batch-1");

    // No new batch/payments may be created on replay.
    expect(prismaMock.batch.create).not.toHaveBeenCalled();
    expect(prismaMock.payment.createMany).not.toHaveBeenCalled();
    // The replay lookup is scoped to the user + key.
    expect(prismaMock.batch.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", idempotencyKey: VALID_HEADER_KEY },
      include: { payments: true },
    });
  });

  it("resolves a concurrent race (P2002) by returning the winning batch", async () => {
    const winner = {
      id: "batch-1",
      userId: "user-1",
      name: VALID_BODY.name,
      idempotencyKey: VALID_HEADER_KEY,
      payments: [{ id: "p-1", amount: 10, status: "CREATED" }],
    };
    // Replay lookup finds nothing yet…
    prismaMock.batch.findFirst.mockResolvedValueOnce(null);
    // The insert loses the race…
    prismaMock.batch.create.mockRejectedValueOnce(p2002());
    // …and the winner is already on disk for the recovery lookup.
    prismaMock.batch.findFirst.mockResolvedValue(winner);

    const res = await POST(
      makeRequest(VALID_BODY, { "Idempotency-Key": VALID_HEADER_KEY })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta.deduplicated).toBe(true);
    expect(json.data.id).toBe("batch-1");
    expect(prismaMock.payment.createMany).not.toHaveBeenCalled();
  });

  it("rejects a header key shorter than 8 characters with 400", async () => {
    const res = await POST(
      makeRequest(VALID_BODY, { "Idempotency-Key": "short" })
    );
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(prismaMock.batch.create).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-padded body key whose trimmed form is too short", async () => {
    // "  short  " trims to "short" (5 chars) → must fail the 8-char minimum
    // so an effectively invalid key can never be persisted.
    const res = await POST(
      makeRequest({ ...VALID_BODY, idempotencyKey: "  short  " })
    );
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(prismaMock.batch.create).not.toHaveBeenCalled();
  });

  it("trims whitespace from a valid body key before storing", async () => {
    const res = await POST(
      makeRequest({ ...VALID_BODY, idempotencyKey: "  body-key-12345  " })
    );
    expect(res.status).toBe(201);

    const createData = prismaMock.batch.create.mock.calls[0][0].data;
    expect(createData.idempotencyKey).toBe("body-key-12345");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getAuthContext).mockResolvedValue(null as never);
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(prismaMock.batch.create).not.toHaveBeenCalled();
  });
});
