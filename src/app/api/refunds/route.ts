import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const analytics = searchParams.get("analytics") === "true";

  // Stub — returns demo data. Wire to Prisma or contract reads in production.
  if (analytics) {
    return NextResponse.json({
      data: [
        { code: 0, count: 3 },
        { code: 1, count: 7 },
        { code: 2, count: 1 },
        { code: 3, count: 2 },
        { code: 4, count: 5 },
        { code: 5, count: 2 },
      ],
    });
  }

  return NextResponse.json({
    data: [],
  });
}
