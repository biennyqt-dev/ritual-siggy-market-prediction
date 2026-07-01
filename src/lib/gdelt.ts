import type { NewsSignal } from "@/lib/types";

export function gdeltTerms(query: string) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .filter(
      (word) =>
        !["will", "what", "when", "this", "that", "before", "after"].includes(
          word
        )
    )
    .slice(0, 5);
}

export function gdeltUrl(query: string) {
  const terms = gdeltTerms(query);
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", terms.join(" OR ") || query);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("maxrecords", "6");
  url.searchParams.set("format", "json");
  url.searchParams.set("sort", "HybridRel");
  return url;
}

export function signalsFromGdelt(
  payload: unknown,
  query: string
): NewsSignal[] {
  const terms = gdeltTerms(query);
  const articles =
    payload && typeof payload === "object" && Array.isArray(
      (payload as { articles?: unknown[] }).articles
    )
      ? (payload as {
          articles: Array<{
            title?: string;
            url?: string;
            domain?: string;
            seendate?: string;
          }>;
        }).articles
      : [];

  return articles
    .filter((article) => Boolean(article.title && article.url))
    .map((article) => {
      const title = article.title!;
      const matched = terms.filter((term) =>
        title.toLowerCase().includes(term)
      ).length;
      let domain = article.domain;
      if (!domain) {
        try {
          domain = new URL(article.url!).hostname;
        } catch {
          domain = "";
        }
      }
      return {
        title,
        url: article.url!,
        domain,
        seenAt: article.seendate,
        relevance: terms.length
          ? Math.round((matched / terms.length) * 100)
          : 0,
      };
    });
}
