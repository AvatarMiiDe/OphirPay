import { NextResponse } from "next/server";
import { z } from "zod";

// ── Standard Response Types ────────────────────────────────────

interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp?: string;
  };
}

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

// ── Response Helpers ───────────────────────────────────────────

export function successResponse<T>(
  data: T,
  meta?: ApiSuccess<T>["meta"],
  status = 200
) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString(), ...meta },
    } satisfies ApiSuccess<T>,
    { status }
  );
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
      timestamp: new Date().toISOString(),
    } satisfies ApiError,
    { status }
  );
}

export function validationError(err: z.ZodError) {
  return errorResponse(
    "VALIDATION_ERROR",
    "Request validation failed",
    400,
    err.issues.map((e) => ({ path: e.path.join("."), message: e.message }))
  );
}

export function notFoundError(resource = "Resource") {
  return errorResponse("NOT_FOUND", `${resource} not found`, 404);
}

export function serverError(message = "Internal server error") {
  return errorResponse("INTERNAL_ERROR", message, 500);
}

export function unauthorizedError(message = "Unauthorized") {
  return errorResponse("UNAUTHORIZED", message, 401);
}

export function rateLimitError(message = "Too many requests") {
  return errorResponse("RATE_LIMITED", message, 429);
}
