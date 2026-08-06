import { NextResponse } from "next/server";

export async function GET() {
  // Stub — returns demo hooks. Will be wired to on-chain get_subscriber_hooks reads.
  return NextResponse.json({
    data: [],
  });
}
