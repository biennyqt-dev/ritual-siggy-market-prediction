import { NextRequest, NextResponse } from "next/server";
import { confidenceHistory } from "@/lib/market-generator/history";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const marketId = request.nextUrl.searchParams.get("marketId")?.trim();
  const probability = Number(
    request.nextUrl.searchParams.get("probability") ?? "50"
  );
  if (!marketId || !Number.isFinite(probability)) {
    return NextResponse.json({ history: [] }, { status: 400 });
  }

  return NextResponse.json({
    history: confidenceHistory(marketId, probability),
    provider: "SIGGY confidence engine",
    updatedAt: new Date().toISOString(),
    live: true,
  });
}
