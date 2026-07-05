"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { PredictionMarket } from "@/lib/types";

export function MarketDetails({ market }: { market: PredictionMarket }) {
  return (
    <aside className="ai-reasoning-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">SIGGY reasoning panel</span>
          <h2>Why this market exists</h2>
        </div>
        <span className="ai-badge">
          <Sparkles size={13} /> {market.confidenceScore ?? 0}% confidence
        </span>
      </div>
      <p className="reasoning-lead">{market.relevanceReason}</p>
      <div className="reasoning-cases">
        <article className="yes-case">
          <ArrowUpRight size={17} />
          <div>
            <small>WHAT MAKES YES HAPPEN</small>
            <p>{market.yesCase}</p>
          </div>
        </article>
        <article className="no-case">
          <ArrowDownRight size={17} />
          <div>
            <small>WHAT MAKES NO HAPPEN</small>
            <p>{market.noCase}</p>
          </div>
        </article>
      </div>
      <div className="resolution-rule">
        <Scale size={17} />
        <div>
          <small>OBJECTIVE RESOLUTION RULE</small>
          <p>{market.resolutionCriteria}</p>
          <span>{market.resolutionSource}</span>
        </div>
      </div>
      <div className="supporting-data-list">
        {(market.supportingData ?? []).map((datum) => (
          <a
            href={datum.sourceUrl}
            target="_blank"
            rel="noreferrer"
            key={`${datum.source}-${datum.label}`}
          >
            {datum.live ? <ShieldCheck size={15} /> : <CheckCircle2 size={15} />}
            <div>
              <small>
                {datum.source} · {datum.live ? "LIVE" : "MOCK"}
              </small>
              <strong>
                {datum.label}: {datum.value}
              </strong>
              <span>{datum.detail}</span>
            </div>
            <ExternalLink size={14} />
          </a>
        ))}
      </div>
      <p className="reasoning-method">{market.aiReasoning}</p>
    </aside>
  );
}
