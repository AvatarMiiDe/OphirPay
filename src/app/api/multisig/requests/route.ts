// SPDX-License-Identifier: MIT

import { type NextRequest, NextResponse } from "next/server";

// GET /api/multisig/requests — list approval requests
export async function GET() {
  return NextResponse.json({
    data: [
      {
        id: 1,
        proposer: "GABC...",
        payee: "GDEF...",
        amount: "500.00",
        approvals_count: 1,
        threshold_met: false,
        executed: false,
      },
    ],
  });
}

// POST /api/multisig/propose — create proposal
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    success: true,
    data: { id: 1, ...body },
  });
}
