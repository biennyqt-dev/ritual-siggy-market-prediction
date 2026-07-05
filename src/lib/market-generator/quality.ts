import type { PredictionMarket } from "@/lib/types";

export interface QualityResult {
  passed: boolean;
  score: number;
  checks: {
    objective: boolean;
    deadline: boolean;
    trustedSource: boolean;
    relevant: boolean;
    specific: boolean;
    resolvable: boolean;
  };
  reasons: string[];
}

export function normalizeQuestion(question: string) {
  return question
    .toLowerCase()
    .replace(/\d+(?:[.,]\d+)?/g, "#")
    .replace(/[^a-z# ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function evaluateMarketQuality(
  market: PredictionMarket,
  now = new Date()
): QualityResult {
  const deadlineTime = market.endDate ? new Date(market.endDate).getTime() : 0;
  const checks = {
    objective:
      /^will\b/i.test(market.question) &&
      Boolean(market.resolutionCriteria?.match(/resolve yes/i)),
    deadline:
      Number.isFinite(deadlineTime) &&
      deadlineTime > now.getTime() + 5 * 60_000,
    trustedSource:
      /^https:\/\//.test(market.sourceUrl) &&
      Boolean(market.resolutionSource?.trim()),
    relevant: Boolean(market.relevanceReason && market.supportingData?.length),
    specific:
      market.question.length >= 25 &&
      market.question.length <= 180 &&
      /\d/.test(market.question),
    resolvable:
      Boolean(market.yesCase && market.noCase) &&
      market.probability >= 5 &&
      market.probability <= 95,
  };
  const reasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => `${name} check failed`);
  const score = Math.round(
    (Object.values(checks).filter(Boolean).length / Object.keys(checks).length) *
      100
  );
  return { passed: reasons.length === 0, score, checks, reasons };
}

export function removeDuplicateMarkets(markets: PredictionMarket[]) {
  const seen = new Set<string>();
  return markets.filter((market) => {
    const key = normalizeQuestion(market.question);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
