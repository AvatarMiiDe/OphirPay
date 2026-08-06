import { type NextRequest, NextResponse } from "next/server";

// GET /api/multisig — get multisig config
export async function GET() {
  return NextResponse.json({
    data: {
      threshold: 2,
      signers: [],
      enabled: false,
    },
  });
}

// POST /api/multisig — configure multisig
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    success: true,
    data: {
      threshold: body.threshold ?? 2,
      signers: body.signers ?? [],
      enabled: body.enabled ?? false,
    },
  });
}
