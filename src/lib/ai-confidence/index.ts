import type { MarketSignal } from "@/lib/data-sources/types";

export interface ConfidenceResult {
  confidence: number;
  yesOdds: number;
  noOdds: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  movement: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function scoreSignal(signal: MarketSignal, now = new Date()): ConfidenceResult {
  const ageMinutes = Math.max(
    0,
    (now.getTime() - new Date(signal.observedAt).getTime()) / 60_000
  );
  const recency = clamp(100 - ageMinutes / 3, 45, 100);
  const movement =
    signal.previousValue && signal.previousValue !== 0
      ? ((signal.currentValue - signal.previousValue) /
          Math.abs(signal.previousValue)) *
        100
      : 0;
  const evidenceStrength =
    signal.kind === "price" || signal.kind === "gas" || signal.kind === "tvl"
      ? 92
      : signal.kind === "block" || signal.kind === "count"
        ? 86
        : 72;
  const confidence = Math.round(
    clamp(
      signal.trustScore * 0.5 +
        recency * 0.25 +
        evidenceStrength * 0.25 -
        (signal.live ? 0 : 18),
      35,
      97
    )
  );
  const trendBias = clamp(movement * 1.7, -22, 22);
  const countBias =
    signal.kind === "count" || signal.kind === "headline"
      ? clamp(signal.currentValue * 1.2 - 8, -12, 18)
      : 0;
  const yesOdds = Math.round(clamp(50 + trendBias + countBias, 15, 85));
  const volatility = Math.abs(movement);
  const risk: ConfidenceResult["risk"] =
    !signal.live || volatility > 8 || confidence < 60
      ? "HIGH"
      : volatility > 3 || confidence < 78
        ? "MEDIUM"
        : "LOW";

  return {
    confidence,
    yesOdds,
    noOdds: 100 - yesOdds,
    risk,
    movement,
  };
}
