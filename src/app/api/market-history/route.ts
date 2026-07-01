import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const tokenId = request.nextUrl.searchParams.get("tokenId");
  const interval = request.nextUrl.searchParams.get("interval") ?? "1w";
  if (!tokenId) {
    return NextResponse.json({ history: [] }, { status: 400 });
  }

  const url = new URL("https://clob.polymarket.com/prices-history");
  url.searchParams.set("market", tokenId);
  url.searchParams.set("interval", interval);
  url.searchParams.set("fidelity", interval === "1d" ? "15" : "60");

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`History feed returned ${response.status}`);
    const data = (await response.json()) as {
      history?: Array<{ t: number; p: number }>;
    };

    return NextResponse.json({
      history: (data.history ?? []).map((point) => ({
        time: Number(point.t),
        value: Number(point.p) * 100,
      })),
      provider: "Polymarket CLOB",
      updatedAt: new Date().toISOString(),
      live: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        history: [],
        error: error instanceof Error ? error.message : "History unavailable",
      },
      { status: 502 }
    );
  }
}
