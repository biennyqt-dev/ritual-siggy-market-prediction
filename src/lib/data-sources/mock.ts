import type { DataSourceResult, MarketSignal } from "@/lib/data-sources/types";

function dateSeed(now: Date) {
  return Number(now.toISOString().slice(0, 10).replaceAll("-", ""));
}

export function mockSignals(now = new Date()): DataSourceResult {
  const seed = dateSeed(now);
  const signals: MarketSignal[] = [
    {
      id: "mock-btc",
      category: "Crypto",
      kind: "price",
      provider: "SIGGY Mock Adapter",
      title: "Bitcoin (BTC)",
      metric: "BTC USD price",
      currentValue: 60_000 + (seed % 17) * 500,
      previousValue: 59_500 + (seed % 13) * 500,
      unit: "USD",
      observedAt: now.toISOString(),
      sourceUrl: "https://www.coingecko.com/en/coins/bitcoin",
      resolutionSource: "Mock CoinGecko-compatible adapter",
      live: false,
      trustScore: 55,
      tags: ["mock", "crypto", "bitcoin"],
      detail: "Development fixture shaped like the CoinGecko adapter.",
    },
    {
      id: "mock-ai-news",
      category: "AI",
      kind: "headline",
      provider: "SIGGY Mock Adapter",
      title: "AI product release coverage",
      metric: "24h indexed headlines",
      currentValue: 8 + (seed % 9),
      unit: "headlines",
      observedAt: now.toISOString(),
      sourceUrl: "https://www.gdeltproject.org",
      resolutionSource: "Mock GDELT-compatible adapter",
      live: false,
      trustScore: 50,
      tags: ["mock", "ai", "news"],
      detail: "Development fixture shaped like the GDELT adapter.",
    },
    {
      id: "mock-ritual-github",
      category: "Ritual",
      kind: "count",
      provider: "SIGGY Mock Adapter",
      title: "Ritual ecosystem development",
      metric: "UTC-day commits",
      currentValue: seed % 5,
      unit: "commits",
      observedAt: now.toISOString(),
      sourceUrl: "https://github.com/ritual-foundation",
      resolutionSource: "Mock GitHub-compatible adapter",
      live: false,
      trustScore: 52,
      tags: ["mock", "ritual", "github"],
      detail: "Development fixture shaped like the GitHub adapter.",
    },
  ];

  return {
    provider: "SIGGY Mock Adapters",
    status: "fallback",
    signals,
    updatedAt: now.toISOString(),
  };
}
