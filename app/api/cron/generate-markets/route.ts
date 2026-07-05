import { NextRequest, NextResponse } from "next/server";
import { generateDailyMarkets } from "@/lib/market-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const batch = await generateDailyMarkets({ force: true });
  return NextResponse.json({
    ok: true,
    generatedAt: batch.generatedAt,
    marketCount: batch.markets.length,
    rejectedCount: batch.rejected.length,
    dataMode: batch.dataMode,
    sources: batch.sources.map((source) => ({
      provider: source.provider,
      status: source.status,
      signalCount: source.signals.length,
    })),
  });
}
