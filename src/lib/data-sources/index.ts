import { coinGeckoAdapter } from "@/lib/data-sources/coingecko";
import { defiLlamaAdapter } from "@/lib/data-sources/defillama";
import { githubAdapter } from "@/lib/data-sources/github";
import { mockSignals } from "@/lib/data-sources/mock";
import { newsAdapter } from "@/lib/data-sources/news";
import { onchainAdapter } from "@/lib/data-sources/onchain";
import { socialAdapter } from "@/lib/data-sources/social";
import type {
  DataSourceAdapter,
  DataSourceResult,
  MarketSignal,
} from "@/lib/data-sources/types";

export interface SignalCollection {
  signals: MarketSignal[];
  sources: DataSourceResult[];
  mode: "LIVE" | "MIXED" | "MOCK";
  updatedAt: string;
}

const adapters: DataSourceAdapter[] = [
  coinGeckoAdapter,
  defiLlamaAdapter,
  githubAdapter,
  newsAdapter,
  onchainAdapter,
  socialAdapter,
];

export async function collectMarketSignals(options?: {
  now?: Date;
  forceMock?: boolean;
}): Promise<SignalCollection> {
  const now = options?.now ?? new Date();
  if (options?.forceMock) {
    const mock = mockSignals(now);
    return {
      signals: mock.signals,
      sources: [mock],
      mode: "MOCK",
      updatedAt: now.toISOString(),
    };
  }

  const settled = await Promise.allSettled(
    adapters.map((adapter) => adapter.collect(now))
  );
  const sources: DataSourceResult[] = settled.map((item, index) =>
    item.status === "fulfilled"
      ? item.value
      : {
          provider: adapters[index].id,
          status: "unavailable",
          signals: [],
          error:
            item.reason instanceof Error
              ? item.reason.message
              : "Data source unavailable",
          updatedAt: now.toISOString(),
        }
  );
  const liveSignals = sources.flatMap((source) => source.signals);
  if (!liveSignals.length) {
    const mock = mockSignals(now);
    return {
      signals: mock.signals,
      sources: [...sources, mock],
      mode: "MOCK",
      updatedAt: now.toISOString(),
    };
  }

  return {
    signals: liveSignals,
    sources,
    mode: sources.some((source) => source.status !== "live")
      ? "MIXED"
      : "LIVE",
    updatedAt: now.toISOString(),
  };
}
