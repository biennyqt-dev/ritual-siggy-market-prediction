import { NextResponse } from "next/server";
import {
  configuredProtocolAddress,
  protocolContractHasCode,
  readProtocolStats,
} from "@/lib/protocol-stats-server";
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
        activeMarkets: null,
        contractAddress: null,
        contractConfigured: false,
        error: "missing-or-invalid-contract-address",
        timeframe,
        updatedAt: new Date().toISOString(),
        volumeWei: "0",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    if (!(await protocolContractHasCode(contractAddress))) {
      return NextResponse.json(
        {
          activeMarkets: null,
          contractAddress,
          contractConfigured: false,
          error: "address-has-no-contract-code",
          timeframe,
          updatedAt: new Date().toISOString(),
          volumeWei: "0",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(await readProtocolStats(contractAddress, timeframe), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        activeMarkets: null,
        contractAddress,
        contractConfigured: true,
        error:
          error instanceof Error
            ? error.message
            : "protocol-statistics-unavailable",
        timeframe,
        updatedAt: new Date().toISOString(),
        volumeWei: "0",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
