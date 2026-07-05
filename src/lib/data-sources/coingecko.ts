import type {
  DataSourceAdapter,
  DataSourceResult,
  MarketSignal,
} from "@/lib/data-sources/types";
import { fetchJson } from "@/lib/data-sources/utils";

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  high_24h: number | null;
  low_24h: number | null;
  last_updated: string;
}

const TRACKED_COINS = "bitcoin,ethereum,solana";

export const coinGeckoAdapter: DataSourceAdapter = {
  id: "coingecko",
  async collect(now): Promise<DataSourceResult> {
    const url =
      "https://api.coingecko.com/api/v3/coins/markets" +
      `?vs_currency=usd&ids=${TRACKED_COINS}&price_change_percentage=24h`;
    const rows = await fetchJson<CoinGeckoMarket[]>(url);
    const signals: MarketSignal[] = rows
      .filter((row) => Number.isFinite(row.current_price))
      .map((row) => {
        const change = Number(row.price_change_percentage_24h ?? 0);
        const previous =
          change === -100 ? row.current_price : row.current_price / (1 + change / 100);
        return {
          id: `coingecko-${row.id}`,
          category: "Crypto",
          kind: "price",
          provider: "CoinGecko",
          title: `${row.name} (${row.symbol.toUpperCase()})`,
          metric: `${row.symbol.toUpperCase()} USD price`,
          currentValue: row.current_price,
          previousValue: previous,
          unit: "USD",
          observedAt: row.last_updated || now.toISOString(),
          sourceUrl: `https://www.coingecko.com/en/coins/${row.id}`,
          resolutionSource: `CoinGecko ${row.name} USD market page`,
          live: true,
          trustScore: 92,
          tags: ["crypto", row.id, row.symbol.toLowerCase(), "daily"],
          detail: `24h range $${Number(row.low_24h ?? 0).toLocaleString()}–$${Number(
            row.high_24h ?? 0
          ).toLocaleString()} · ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
        };
      });

    return {
      provider: "CoinGecko",
      status: signals.length ? "live" : "unavailable",
      signals,
      updatedAt: now.toISOString(),
    };
  },
};
