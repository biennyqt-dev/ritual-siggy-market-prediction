import type {
  DataSourceAdapter,
  DataSourceResult,
  MarketSignal,
} from "@/lib/data-sources/types";
import { fetchJson } from "@/lib/data-sources/utils";

interface LlamaChain {
  name: string;
  tokenSymbol?: string;
  tvl: number;
  change_1d?: number;
}

const TRACKED = new Set(["Ethereum", "Solana"]);

export const defiLlamaAdapter: DataSourceAdapter = {
  id: "defillama",
  async collect(now): Promise<DataSourceResult> {
    const rows = await fetchJson<LlamaChain[]>("https://api.llama.fi/v2/chains");
    const signals: MarketSignal[] = rows
      .filter((row) => TRACKED.has(row.name) && Number.isFinite(row.tvl))
      .map((row) => {
        const change = Number(row.change_1d ?? 0);
        const previous = change === -100 ? row.tvl : row.tvl / (1 + change / 100);
        return {
          id: `defillama-${row.name.toLowerCase()}`,
          category: "DeFi",
          kind: "tvl",
          provider: "DefiLlama",
          title: `${row.name} DeFi TVL`,
          metric: `${row.name} total value locked`,
          currentValue: row.tvl,
          previousValue: previous,
          unit: "USD",
          observedAt: now.toISOString(),
          sourceUrl: `https://defillama.com/chain/${encodeURIComponent(row.name)}`,
          resolutionSource: `DefiLlama ${row.name} chain dashboard`,
          live: true,
          trustScore: 90,
          tags: ["defi", "tvl", row.name.toLowerCase()],
          detail: `${change >= 0 ? "+" : ""}${change.toFixed(2)}% over 24 hours`,
        };
      });

    return {
      provider: "DefiLlama",
      status: signals.length ? "live" : "unavailable",
      signals,
      updatedAt: now.toISOString(),
    };
  },
};
