// SPDX-License-Identifier: MIT

import { NextResponse } from "next/server";
import { z } from "zod";
import { handlePrismaError } from "@/lib/prisma-errors";
import { logger } from "@/lib/logger";

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
  status = 200,
  cacheHeader?: string
) {
  const response = NextResponse.json(
    {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString(), ...meta },
    } satisfies ApiSuccess<T>,
    { status }
  );
  if (cacheHeader) {
    response.headers.set("Cache-Control", cacheHeader);
  }
  return response;
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

export function conflictError(message: string) {
  return errorResponse("CONFLICT", message, 409);
}

export function badRequestError(message: string) {
  return errorResponse("BAD_REQUEST", message, 400);
}

// ── Unified Error Handler ──────────────────────────────────────

/**
 * Map any caught error to a proper API error response.
 *
 * • Prisma errors → correct HTTP status (404, 409, 503, etc.)
 * • Zod validation errors → 400 with field details
 * • Generic errors → 500 (masked in production for security)
 */
export function handleApiError(err: unknown, context?: string): NextResponse {
  // Log the real error for debugging
  logger.error(context ?? "API error", {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  // Zod validation errors (check first — before Prisma instance checks)
  if (err instanceof z.ZodError) {
    return validationError(err);
  }

  // Prisma errors — use handlePrismaError which knows all Prisma error types
  if (
    err instanceof Error &&
    err.constructor &&
    (err.constructor.name === "PrismaClientKnownRequestError" ||
     err.constructor.name === "PrismaClientValidationError" ||
     err.constructor.name === "PrismaClientInitializationError" ||
     err.constructor.name === "PrismaClientUnknownRequestError" ||
     err.constructor.name === "PrismaClientRustPanicError")
  ) {
    const mapped = handlePrismaError(err);
    return errorResponse(mapped.code, mapped.message, mapped.status);
  }

  // Fallback for Prisma errors detected by code pattern
  if (err && typeof err === "object" && "code" in err) {
    const prismaCode = (err as { code: string }).code;
    if (typeof prismaCode === "string" && prismaCode.startsWith("P")) {
      const mapped = handlePrismaError(err);
      return errorResponse(mapped.code, mapped.message, mapped.status);
    }
  }

  // Generic — mask the message in production
  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred."
      : err instanceof Error
        ? err.message
        : "An unexpected error occurred.";

  return serverError(message);
}
