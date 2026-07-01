import type { PredictionMarket } from "@/lib/types";

export const GAMMA_ORIGIN = "https://gamma-api.polymarket.com";

function arrayFromJson(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function numberFrom(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function classifyMarket(
  question: string,
  rawCategory: string,
  tags: Array<Record<string, unknown>>
) {
  const tagText = tags
    .map((tag) => `${String(tag.label ?? "")} ${String(tag.slug ?? "")}`)
    .join(" ");
  const haystack = `${question} ${rawCategory} ${tagText}`.toLowerCase();

  if (
    /\b(tge|token generation|mainnet|airdrop|token launch|launch token)\b/.test(
      haystack
    )
  ) {
    return "TGE / Mainnet";
  }
  if (
    /\b(crypto|bitcoin|btc|ethereum|eth|solana|sol|xrp|doge|defi|stablecoin|blockchain|token)\b/.test(
      haystack
    )
  ) {
    return "Crypto";
  }
  return rawCategory || "World";
}

function mapMarket(
  raw: Record<string, unknown>,
  event?: Record<string, unknown>
): PredictionMarket | null {
  const question = String(raw.question ?? raw.title ?? "").trim();
  const id = String(raw.conditionId ?? raw.id ?? "").trim();
  if (!question || !id || raw.closed === true || raw.active === false) return null;

  const prices = arrayFromJson(raw.outcomePrices);
  const tokenIds = arrayFromJson(raw.clobTokenIds);
  const yesPrice = Number(prices[0]);
  if (
    !tokenIds[0] ||
    !Number.isFinite(yesPrice) ||
    yesPrice < 0 ||
    yesPrice > 1
  ) {
    return null;
  }

  const slug = String(raw.slug ?? id);
  const eventSlug = String(event?.slug ?? raw.eventSlug ?? slug);
  const tags = Array.isArray(event?.tags)
    ? (event.tags as Array<Record<string, unknown>>)
    : Array.isArray(raw.tags)
      ? (raw.tags as Array<Record<string, unknown>>)
      : [];
  const rawCategory = String(raw.category ?? event?.category ?? "");
  const eventMarketCount = Array.isArray(event?.markets)
    ? Math.max(event.markets.length, 1)
    : 1;

  return {
    id,
    question,
    slug,
    category: classifyMarket(question, rawCategory, tags),
    description: String(raw.description ?? event?.description ?? ""),
    image:
      String(raw.image ?? raw.icon ?? event?.image ?? event?.icon ?? "") ||
      undefined,
    endDate:
      String(raw.endDate ?? raw.endDateIso ?? event?.endDate ?? "") || undefined,
    probability: yesPrice * 100,
    volume: numberFrom(
      raw.volume24hr ??
        raw.volumeNum ??
        raw.volume ??
        numberFrom(event?.volume24hr ?? event?.volume) / eventMarketCount
    ),
    liquidity: numberFrom(
      raw.liquidityNum ??
        raw.liquidity ??
        numberFrom(event?.liquidityClob ?? event?.liquidity) / eventMarketCount
    ),
    change24h: numberFrom(raw.oneDayPriceChange) * 100,
    tokenId: tokenIds[0],
    sourceUrl: `https://polymarket.com/event/${eventSlug}`,
  };
}

export function marketsFromEvents(payload: unknown): PredictionMarket[] {
  const events = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { events?: unknown[] })?.events)
      ? (payload as { events: unknown[] }).events
      : [];
  const markets = events.flatMap((eventValue) => {
    if (!eventValue || typeof eventValue !== "object") return [];
    const event = eventValue as Record<string, unknown>;
    const children = Array.isArray(event.markets) ? event.markets : [];
    return children
      .map((market) =>
        market && typeof market === "object"
          ? mapMarket(market as Record<string, unknown>, event)
          : null
      )
      .filter(Boolean) as PredictionMarket[];
  });

  return Array.from(new Map(markets.map((market) => [market.id, market])).values());
}

export function prioritizeMarkets(markets: PredictionMarket[]) {
  const launchAndCrypto = markets.filter(
    (market) =>
      market.category === "Crypto" || market.category === "TGE / Mainnet"
  );
  const prioritized = [...launchAndCrypto.slice(0, 18), ...markets];
  return Array.from(
    new Map(prioritized.map((market) => [market.id, market])).values()
  ).slice(0, 48);
}
