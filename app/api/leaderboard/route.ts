import { NextResponse } from "next/server";
import {
  configuredProtocolAddress,
  protocolContractHasCode,
} from "@/lib/protocol-stats-server";
import { readProtocolLeaderboard } from "@/lib/leaderboard-server";
import {
  isProtocolTimeframe,
  type ProtocolTimeframe,
} from "@/lib/protocol-stats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("timeframe");
  const timeframe: ProtocolTimeframe = isProtocolTimeframe(requested)
    ? requested
    : "24h";
  const contractAddress = configuredProtocolAddress();

  if (!contractAddress) {
    return NextResponse.json(
      {
        contractAddress: null,
        contractConfigured: false,
        entries: [],
        error: "missing-or-invalid-contract-address",
        timeframe,
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    if (!(await protocolContractHasCode(contractAddress))) {
      return NextResponse.json(
        {
          contractAddress,
          contractConfigured: false,
          entries: [],
          error: "address-has-no-contract-code",
          timeframe,
          updatedAt: new Date().toISOString(),
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      await readProtocolLeaderboard(contractAddress, timeframe),
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        contractAddress,
        contractConfigured: true,
        entries: [],
        error:
          error instanceof Error ? error.message : "leaderboard-unavailable",
        timeframe,
        updatedAt: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
