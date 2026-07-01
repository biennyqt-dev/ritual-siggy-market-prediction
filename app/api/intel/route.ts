import { NextRequest, NextResponse } from "next/server";
import { gdeltUrl, signalsFromGdelt } from "@/lib/gdelt";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ signals: [] });

  try {
    const response = await fetch(gdeltUrl(query), {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`News feed returned ${response.status}`);
    const signals = signalsFromGdelt(await response.json(), query);

    return NextResponse.json({
      signals,
      agent: "SIGGY live GDELT monitor",
      provider: "GDELT DOC 2.0",
      updatedAt: new Date().toISOString(),
      live: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        signals: [],
        agent: "SIGGY live GDELT monitor",
        provider: "GDELT DOC 2.0",
        updatedAt: new Date().toISOString(),
        live: false,
        error: error instanceof Error ? error.message : "News feed unavailable",
      },
      { status: 502 }
    );
  }
}
