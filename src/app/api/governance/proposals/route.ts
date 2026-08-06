// SPDX-License-Identifier: MIT

import { type NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [
      {
        id: 1,
        title: "Upgrade to v3",
        description: "Proposal to upgrade the OphirPay contract to version 3",
        action_type: "upgrade",
        proposer: "GABC1234...",
        yes_votes: 120,
        no_votes: 30,
        voting_ends_at: Math.floor(Date.now() / 1000) + 86400,
        executed: false,
      },
    ],
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ success: true, data: { id: Date.now(), ...body } });
}
