import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { STELLAR_NETWORK, SOROBAN_RPC_URL } from "@/lib/stellar";

export async function GET() {
  try {
    // Check database connectivity
    let dbStatus = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "error";
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        stellar: {
          network: STELLAR_NETWORK,
          rpcUrl: SOROBAN_RPC_URL,
        },
      },
      version: "0.1.0",
    });
  } catch {
    return NextResponse.json(
      { status: "unhealthy", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
