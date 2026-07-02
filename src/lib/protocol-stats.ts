import {
  formatEther,
  getAddress,
  isAddress,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";

export const PROTOCOL_TIMEFRAMES = ["24h", "7d", "30d", "all"] as const;
export type ProtocolTimeframe = (typeof PROTOCOL_TIMEFRAMES)[number];

export const PROTOCOL_TIMEFRAME_LABELS: Record<ProtocolTimeframe, string> = {
  "24h": "24h volume",
  "7d": "7d volume",
  "30d": "30d volume",
  all: "All-time volume",
};

const TIMEFRAME_SECONDS: Record<Exclude<ProtocolTimeframe, "all">, number> = {
  "24h": 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
  "30d": 30 * 24 * 60 * 60,
};

export interface ProtocolMarketCreated {
  marketId?: Hex;
  closeTime?: bigint;
}

export interface ProtocolMarketResolved {
  marketId?: Hex;
}

export interface ProtocolPredictionPlaced {
  amount?: bigint;
}

export function normalizeProtocolContractAddress(
  value: string | null | undefined
): Address | null {
  const candidate = value?.trim();
  if (!candidate || !isAddress(candidate, { strict: false })) return null;
  const address = getAddress(candidate);
  return address === zeroAddress ? null : address;
}

export function resolveProtocolContractAddress(
  env: Record<string, string | undefined>
): Address | null {
  return normalizeProtocolContractAddress(
    env.SIGGY_RITUAL_CONTRACT_ADDRESS ??
      env.NEXT_PUBLIC_SIGGY_RITUAL_CONTRACT_ADDRESS ??
      env.NEXT_PUBLIC_SIGGY_CONTRACT
  );
}

export function isProtocolTimeframe(
  value: string | null
): value is ProtocolTimeframe {
  return PROTOCOL_TIMEFRAMES.includes(value as ProtocolTimeframe);
}

export function timeframeStartTimestamp(
  timeframe: ProtocolTimeframe,
  nowSeconds: number
) {
  if (timeframe === "all") return null;
  return nowSeconds - TIMEFRAME_SECONDS[timeframe];
}

export function countOpenProtocolMarkets(
  created: ProtocolMarketCreated[],
  resolved: ProtocolMarketResolved[],
  nowSeconds: number
) {
  const resolutionIds = new Set(
    resolved
      .map((event) => event.marketId?.toLowerCase())
      .filter((marketId): marketId is string => Boolean(marketId))
  );
  const markets = new Map<string, bigint>();

  for (const event of created) {
    if (!event.marketId || event.closeTime === undefined) continue;
    markets.set(event.marketId.toLowerCase(), event.closeTime);
  }

  let count = 0;
  for (const [marketId, closeTime] of markets) {
    if (
      !resolutionIds.has(marketId) &&
      closeTime > BigInt(nowSeconds)
    ) {
      count += 1;
    }
  }
  return count;
}

export function sumProtocolVolume(events: ProtocolPredictionPlaced[]) {
  return events.reduce((total, event) => total + (event.amount ?? 0n), 0n);
}

export function formatProtocolVolume(volumeWei: bigint) {
  const value = Number(formatEther(volumeWei));
  if (!Number.isFinite(value)) return `${formatEther(volumeWei)} RIT`;
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 1_000 ? 0 : 4,
  }).format(value)} RIT`;
}
