"use client";

import { Radio, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { MarketCard } from "@/components/MarketCard";
import type { PredictionMarket } from "@/lib/types";

const DISCOVERY_TABS = ["Today", "Trending", "Crypto", "AI", "Ritual"] as const;

export function MarketDashboard({
  markets,
  selectedId,
  onSelect,
  dataMode,
}: {
  markets: PredictionMarket[];
  selectedId?: string;
  onSelect: (market: PredictionMarket) => void;
  dataMode: "LIVE" | "MIXED" | "MOCK";
}) {
  const [tab, setTab] = useState<(typeof DISCOVERY_TABS)[number]>("Today");
  const visible = useMemo(() => {
    const approved = markets.filter(
      (market) =>
        market.publicationStatus !== "REJECTED" &&
        market.publicationStatus !== "RESOLVED"
    );
    if (tab === "Trending") {
      return [...approved]
        .sort(
          (left, right) =>
            (right.trendingScore ?? 0) - (left.trendingScore ?? 0)
        )
        .slice(0, 6);
    }
    if (tab === "Today") return approved.slice(0, 6);
    return approved
      .filter((market) => market.category === tab)
      .slice(0, 6);
  }, [markets, tab]);

  return (
    <section className="generated-market-dashboard">
      <div className="section-head generated-dashboard-head">
        <div>
          <span className="eyebrow">SIGGY autonomous market desk</span>
          <h2>Today’s AI-generated markets</h2>
          <p>
            Objective markets created from timestamped live signals and checked
            for deadline, source quality, relevance, and duplicate risk.
          </p>
        </div>
        <span className={`generator-mode mode-${dataMode.toLowerCase()}`}>
          {dataMode === "LIVE" ? <Radio size={13} /> : <Sparkles size={13} />}
          {dataMode} DATA
        </span>
      </div>
      <div className="generated-discovery-tabs" aria-label="Generated market views">
        {DISCOVERY_TABS.map((value) => (
          <button
            type="button"
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value)}
            key={value}
          >
            {value === "Trending" ? <TrendingUp size={13} /> : null}
            {value}
          </button>
        ))}
      </div>
      <div className="generated-market-grid">
        {visible.map((market) => (
          <MarketCard
            market={market}
            selected={market.id === selectedId}
            onSelect={onSelect}
            key={market.id}
          />
        ))}
      </div>
      {!visible.length ? (
        <div className="generated-empty">
          No approved {tab.toLowerCase()} markets passed today’s quality gate.
        </div>
      ) : null}
    </section>
  );
}
