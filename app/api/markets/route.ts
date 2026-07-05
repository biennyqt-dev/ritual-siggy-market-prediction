import { NextRequest, NextResponse } from "next/server";
import { generateDailyMarkets } from "@/lib/market-generator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const force = request.nextUrl.searchParams.has("regenerate");
  const forceMock = request.nextUrl.searchParams.get("mode") === "mock";

  try {
    const batch = await generateDailyMarkets({ force, forceMock });
    const markets = query
      ? batch.markets.filter((market) =>
          [
            market.question,
            market.category,
            market.description,
            ...(market.tags ?? []),
            ...(market.sourceLabels ?? []),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      : batch.markets;

    return NextResponse.json(
      {
        markets,
        provider: batch.generator,
        query,
        updatedAt: batch.generatedAt,
        live: markets.length > 0,
        dataMode: batch.dataMode,
        sources: batch.sources.map((source) => ({
          provider: source.provider,
          status: source.status,
          signalCount: source.signals.length,
          error: source.error,
        })),
        rejectedCount: batch.rejected.length,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        markets: [],
        provider: "SIGGY Daily Market Generator",
        query,
        updatedAt: new Date().toISOString(),
        live: false,
        dataMode: "MOCK",
        error:
          error instanceof Error ? error.message : "Market generation unavailable",
      },
      { status: 502 }
    );
  }
}
