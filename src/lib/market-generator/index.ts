import { scoreSignal } from "@/lib/ai-confidence";
import {
  collectMarketSignals,
  type SignalCollection,
} from "@/lib/data-sources";
import type { MarketSignal } from "@/lib/data-sources/types";
import { compactNumber } from "@/lib/data-sources/utils";
import {
  evaluateMarketQuality,
  removeDuplicateMarkets,
} from "@/lib/market-generator/quality";
import { buildResolutionRule } from "@/lib/resolution-rules";
import type { PredictionMarket } from "@/lib/types";

export interface GeneratedMarketBatch {
  markets: PredictionMarket[];
  rejected: Array<{ question: string; reasons: string[] }>;
  sources: SignalCollection["sources"];
  dataMode: SignalCollection["mode"];
  generatedAt: string;
  generator: string;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

function stableId(signal: MarketSignal, deadline: string) {
  return `siggy-${signal.id}-${deadline.slice(0, 10)}`;
}

function formatSignalValue(signal: MarketSignal) {
  if (signal.unit === "USD") {
    return `$${new Intl.NumberFormat("en-US", {
      notation: signal.currentValue >= 1_000_000 ? "compact" : "standard",
      maximumFractionDigits: signal.currentValue < 10 ? 2 : 0,
    }).format(signal.currentValue)}`;
  }
  if (signal.unit === "block") return signal.currentValue.toLocaleString();
  if (signal.unit === "gwei") return `${signal.currentValue.toFixed(2)} gwei`;
  return `${compactNumber(signal.currentValue)} ${signal.unit}`;
}

function signalToMarket(signal: MarketSignal, mode: SignalCollection["mode"], now: Date) {
  const resolution = buildResolutionRule(signal, now);
  const score = scoreSignal(signal, now);
  const id = stableId(signal, resolution.deadline);
  const sourceDatum = {
    label: signal.metric,
    value: formatSignalValue(signal),
    detail: signal.detail,
    source: signal.provider,
    sourceUrl: signal.sourceUrl,
    observedAt: signal.observedAt,
    live: signal.live,
  };
  const dataMode = signal.live ? mode : "MOCK";
  const market: PredictionMarket = {
    id,
    question: resolution.title,
    slug: slugify(resolution.title),
    category: signal.category,
    description: `${signal.detail} SIGGY generated this binary market from a timestamped ${signal.provider} signal.`,
    endDate: resolution.deadline,
    probability: score.yesOdds,
    volume: 0,
    liquidity: 0,
    change24h: score.movement,
    sourceUrl: signal.sourceUrl,
    generated: true,
    generatedAt: now.toISOString(),
    confidenceScore: score.confidence,
    yesOdds: score.yesOdds,
    noOdds: score.noOdds,
    resolutionCriteria: resolution.criteria,
    resolutionSource: signal.resolutionSource,
    relevanceReason: `${signal.metric} is currently ${formatSignalValue(
      signal
    )}. The deadline converts that live signal into a timely, objective market.`,
    aiReasoning: `SIGGY weighted source trust (${signal.trustScore}/100), data freshness, observed movement (${score.movement.toFixed(
      2
    )}%), and resolution clarity. The result is a ${score.risk.toLowerCase()}-risk market with ${score.confidence}% confidence in its construction quality.`,
    yesCase: resolution.yesCase,
    noCase: resolution.noCase,
    riskLevel: score.risk,
    tags: Array.from(new Set([...signal.tags, "siggy-generated", "binary"])),
    supportingData: [sourceDatum],
    sourceLabels: [signal.provider],
    dataMode,
    publicationStatus: "APPROVED",
    trendingScore: Math.round(
      score.confidence * 0.55 +
        Math.min(30, Math.abs(score.movement) * 3) +
        (signal.live ? 15 : 0)
    ),
  };
  return market;
}

declare global {
  var siggyGeneratedMarketCache:
    | { key: string; expiresAt: number; batch: GeneratedMarketBatch }
    | undefined;
}

export async function generateDailyMarkets(options?: {
  now?: Date;
  force?: boolean;
  forceMock?: boolean;
}): Promise<GeneratedMarketBatch> {
  const now = options?.now ?? new Date();
  const key = `${now.toISOString().slice(0, 10)}:${options?.forceMock ? "mock" : "live"}`;
  const cached = globalThis.siggyGeneratedMarketCache;
  if (
    !options?.force &&
    cached?.key === key &&
    cached.expiresAt > now.getTime()
  ) {
    return cached.batch;
  }

  const collection = await collectMarketSignals({
    now,
    forceMock: options?.forceMock,
  });
  const candidates = removeDuplicateMarkets(
    collection.signals.map((signal) =>
      signalToMarket(signal, collection.mode, now)
    )
  );
  const rejected: GeneratedMarketBatch["rejected"] = [];
  const markets = candidates.filter((market) => {
    const quality = evaluateMarketQuality(market, now);
    if (!quality.passed) {
      rejected.push({ question: market.question, reasons: quality.reasons });
    }
    return quality.passed;
  });
  const batch: GeneratedMarketBatch = {
    markets: markets
      .sort(
        (left, right) =>
          (right.trendingScore ?? 0) - (left.trendingScore ?? 0)
      )
      .slice(0, 24),
    rejected,
    sources: collection.sources,
    dataMode: collection.mode,
    generatedAt: now.toISOString(),
    generator: "SIGGY Daily Market Generator v1",
  };
  globalThis.siggyGeneratedMarketCache = {
    key,
    expiresAt: now.getTime() + 5 * 60_000,
    batch,
  };
  return batch;
}
