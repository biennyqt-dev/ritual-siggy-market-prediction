import { NextResponse } from "next/server";
import {
  GAMMA_ORIGIN,
  marketsFromEvents,
  prioritizeMarkets,
} from "@/lib/polymarket";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const endpoint = query
    ? `${GAMMA_ORIGIN}/public-search?q=${encodeURIComponent(
        query
      )}&events_status=active&keep_closed_markets=0&limit_per_type=20&search_profiles=false`
    : `${GAMMA_ORIGIN}/events?active=true&closed=false&limit=100&order=volume_24hr&ascending=false`;

  try {
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Polymarket returned ${response.status}`);
    const payload = (await response.json()) as unknown;
    const markets = prioritizeMarkets(marketsFromEvents(payload));
    if (!markets.length) throw new Error("No matching active markets");

    return NextResponse.json({
      markets,
      provider: "Polymarket Gamma",
      query,
      updatedAt: new Date().toISOString(),
      live: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        markets: [],
        provider: "Polymarket Gamma",
        query,
        updatedAt: new Date().toISOString(),
        live: false,
        error: error instanceof Error ? error.message : "Market feed unavailable",
      },
      { status: 502 }
    );
  }
}
