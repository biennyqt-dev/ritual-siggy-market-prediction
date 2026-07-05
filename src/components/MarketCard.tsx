"use client";

import { Clock3, Database, ShieldCheck, Sparkles } from "lucide-react";
import type { PredictionMarket } from "@/lib/types";

function deadlineLabel(value?: string) {
  if (!value) return "Deadline pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function MarketCard({
  market,
  selected,
  onSelect,
}: {
  market: PredictionMarket;
  selected?: boolean;
  onSelect: (market: PredictionMarket) => void;
}) {
  return (
    <button
      type="button"
      className={`generated-market-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(market)}
    >
      <div className="generated-card-topline">
        <span>{market.category}</span>
        <em className={`risk-${market.riskLevel?.toLowerCase() ?? "medium"}`}>
          {market.riskLevel ?? "MEDIUM"} RISK
        </em>
      </div>
      <strong>{market.question}</strong>
      <p>{market.aiReasoning}</p>
      <div className="generated-card-stats">
        <span>
          <Sparkles size={13} />
          {market.confidenceScore ?? 0}% confidence
        </span>
        <span>
          <Clock3 size={13} />
          {deadlineLabel(market.endDate)}
        </span>
      </div>
      <div className="generated-odds">
        <span>
          YES <b>{market.yesOdds ?? market.probability}%</b>
        </span>
        <span>
          NO <b>{market.noOdds ?? 100 - market.probability}%</b>
        </span>
      </div>
      <div className="generated-source-row">
        {market.dataMode === "MOCK" ? <Database size={13} /> : <ShieldCheck size={13} />}
        <span>{market.sourceLabels?.join(" · ") || "SIGGY source adapter"}</span>
        <b>{market.dataMode ?? "LIVE"}</b>
      </div>
    </button>
  );
}
