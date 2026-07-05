import type {
  DataSourceAdapter,
  DataSourceResult,
  MarketSignal,
  SignalCategory,
} from "@/lib/data-sources/types";
import { fetchJson } from "@/lib/data-sources/utils";

interface GdeltPayload {
  articles?: Array<{
    title?: string;
    url?: string;
    domain?: string;
    seendate?: string;
  }>;
}

const TOPICS: Array<{
  id: string;
  query: string;
  label: string;
  category: SignalCategory;
  tags: string[];
}> = [
  {
    id: "ai-models",
    query: "(AI model OR artificial intelligence) (launch OR release OR announce)",
    label: "AI model and product releases",
    category: "AI",
    tags: ["ai", "models", "launch"],
  },
  {
    id: "ritual",
    query: "\"Ritual Chain\" OR \"Ritual Foundation\"",
    label: "Ritual ecosystem coverage",
    category: "Ritual",
    tags: ["ritual", "ecosystem", "agents"],
  },
  {
    id: "macro",
    query: "(Federal Reserve OR inflation OR interest rates) economy",
    label: "Macro policy coverage",
    category: "Macro",
    tags: ["macro", "fed", "inflation"],
  },
  {
    id: "world",
    query: "(election OR summit OR ceasefire OR sanctions)",
    label: "Major world-event coverage",
    category: "World",
    tags: ["world", "news", "policy"],
  },
  {
    id: "sports-entertainment",
    query: "(championship OR tournament OR box office OR streaming) announcement",
    label: "Sports and entertainment trends",
    category: "Sports & Entertainment",
    tags: ["sports", "entertainment", "trending"],
  },
];

function gdeltTopicUrl(query: string) {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("maxrecords", "25");
  url.searchParams.set("format", "json");
  url.searchParams.set("sort", "DateDesc");
  url.searchParams.set("timespan", "24h");
  return url.toString();
}

export const newsAdapter: DataSourceAdapter = {
  id: "gdelt-news",
  async collect(now): Promise<DataSourceResult> {
    const settled = await Promise.allSettled(
      TOPICS.map(async (topic) => ({
        topic,
        payload: await fetchJson<GdeltPayload>(gdeltTopicUrl(topic.query)),
      }))
    );
    const signals: MarketSignal[] = settled.flatMap((item) => {
      if (item.status !== "fulfilled") return [];
      const { topic, payload } = item.value;
      const articles = (payload.articles ?? []).filter(
        (article) => article.title && article.url
      );
      if (!articles.length) return [];
      const newest = articles[0];
      return [
        {
          id: `gdelt-${topic.id}`,
          category: topic.category,
          kind: "headline",
          provider: "GDELT",
          title: topic.label,
          metric: "24h indexed headlines",
          currentValue: articles.length,
          unit: "headlines",
          observedAt: now.toISOString(),
          sourceUrl: newest.url!,
          resolutionSource: `GDELT DOC 2.0 query: ${topic.query}`,
          live: true,
          trustScore: 78,
          tags: ["news", ...topic.tags],
          detail: `Latest: ${newest.title} · ${newest.domain || "source"}`,
        },
      ];
    });

    return {
      provider: "GDELT DOC 2.0",
      status: signals.length ? "live" : "unavailable",
      signals,
      error: signals.length ? undefined : "No topic feeds returned data",
      updatedAt: now.toISOString(),
    };
  },
};
