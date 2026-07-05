import type {
  DataSourceAdapter,
  DataSourceResult,
  MarketSignal,
} from "@/lib/data-sources/types";
import { fetchJson } from "@/lib/data-sources/utils";

interface XRecentSearch {
  data?: Array<{ id: string; text: string }>;
  meta?: { result_count?: number };
}

export const socialAdapter: DataSourceAdapter = {
  id: "x-social",
  async collect(now): Promise<DataSourceResult> {
    const token = process.env.X_BEARER_TOKEN;
    if (!token) {
      return {
        provider: "X API",
        status: "unavailable",
        signals: [],
        error: "X_BEARER_TOKEN is not configured",
        updatedAt: now.toISOString(),
      };
    }
    const query = "(Bitcoin OR BTC) lang:en -is:retweet";
    const payload = await fetchJson<XRecentSearch>(
      `https://api.x.com/2/tweets/search/recent?query=${encodeURIComponent(
        query
      )}&max_results=100`,
      { headers: { authorization: `Bearer ${token}` } }
    );
    const count = Number(payload.meta?.result_count ?? payload.data?.length ?? 0);
    const signals: MarketSignal[] = [
      {
        id: "x-btc-mentions",
        category: "Social",
        kind: "sentiment",
        provider: "X API",
        title: "Bitcoin discussion velocity on X",
        metric: "Recent BTC posts",
        currentValue: count,
        unit: "posts",
        observedAt: now.toISOString(),
        sourceUrl: "https://x.com/search?q=Bitcoin",
        resolutionSource: "X API recent-search result_count using the stored query",
        live: true,
        trustScore: 72,
        tags: ["x", "social", "bitcoin", "sentiment"],
        detail: `${count} non-retweet English posts in the latest API sample`,
      },
    ];
    return {
      provider: "X API",
      status: "live",
      signals,
      updatedAt: now.toISOString(),
    };
  },
};
