// SPDX-License-Identifier: MIT

import { type NextRequest, NextResponse } from "next/server";

// POST /api/multisig/approve — approve a payment
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    success: true,
    data: { approved: true, requestId: body.requestId },
  });
}
