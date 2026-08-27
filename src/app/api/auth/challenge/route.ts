// SPDX-License-Identifier: MIT

import { NextResponse } from "next/server";
import { verifyCsrf, withCsrf } from "@/lib/csrf";

/**
 * POST /api/auth/session
 * Establish a session. Protected by CSRF.
 */
export const POST = withCsrf(async (request: Request) => {
  // ... existing session establishment logic
  return NextResponse.json({ success: true });
});

/**
 * DELETE /api/auth/session
 * Revoke the session. Protected by CSRF.
 */
export const DELETE = withCsrf(async (request: Request) => {
  // ... existing session revocation logic
  return NextResponse.json({ success: true });
});