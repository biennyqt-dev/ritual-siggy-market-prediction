"use client";

import {
  Check,
  FlaskConical,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { PredictionMarket } from "@/lib/types";

function tomorrowDeadline() {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return value.toISOString().slice(0, 16);
}

export function AdminMarketPanel({
  markets,
  onMarketsChange,
  onSelect,
}: {
  markets: PredictionMarket[];
  onMarketsChange: (markets: PredictionMarket[]) => void;
  onSelect: (market: PredictionMarket) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Crypto");
  const [deadline, setDeadline] = useState(tomorrowDeadline);
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const counts = useMemo(
    () =>
      markets.reduce(
        (result, market) => {
          const status = market.publicationStatus ?? "APPROVED";
          result[status] += 1;
          return result;
        },
        { DRAFT: 0, APPROVED: 0, REJECTED: 0, RESOLVED: 0 }
      ),
    [markets]
  );

  function update(id: string, patch: Partial<PredictionMarket>) {
    onMarketsChange(
      markets.map((market) => (market.id === id ? { ...market, ...patch } : market))
    );
  }

  async function regenerate(mode: "live" | "mock") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/markets?regenerate=${Date.now()}${mode === "mock" ? "&mode=mock" : ""}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as {
        markets?: PredictionMarket[];
        dataMode?: string;
        error?: string;
      };
      if (!response.ok || !payload.markets?.length) {
        throw new Error(payload.error || "Generator returned no markets");
      }
      onMarketsChange(payload.markets);
      setMessage(
        `${payload.markets.length} ${String(payload.dataMode).toLowerCase()} markets passed the quality gate.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Regeneration failed");
    } finally {
      setBusy(false);
    }
  }

  function addManualMarket(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !deadline) return;
    const id = `manual-${Date.now()}`;
    const sourceUrl = "https://explorer.ritualfoundation.org";
    const market: PredictionMarket = {
      id,
      slug: id,
      question: title.trim().endsWith("?") ? title.trim() : `${title.trim()}?`,
      category,
      description: "Manually created in the SIGGY admin studio.",
      endDate: new Date(deadline).toISOString(),
      probability: 50,
      volume: 0,
      liquidity: 0,
      change24h: 0,
      sourceUrl,
      generated: false,
      generatedAt: new Date().toISOString(),
      confidenceScore: 50,
      yesOdds: 50,
      noOdds: 50,
      resolutionCriteria:
        "Admin must add a final objective resolution rule before approving this draft.",
      resolutionSource: "Admin-selected source required",
      relevanceReason: "Manual draft created by the SIGGY operator.",
      aiReasoning: "Manual market. Quality review is required before approval.",
      yesCase: "The stated event occurs before the deadline.",
      noCase: "The stated event does not occur before the deadline.",
      riskLevel: "HIGH",
      tags: ["manual", "admin"],
      supportingData: [],
      sourceLabels: ["Admin draft"],
      dataMode: "MIXED",
      publicationStatus: "DRAFT",
      trendingScore: 0,
    };
    onMarketsChange([market, ...markets]);
    setTitle("");
    setMessage("Manual draft added. Review it before approval.");
  }

  return (
    <section className="admin-market-panel">
      <div className="section-head admin-head">
        <div>
          <span className="eyebrow">Browser-local operator workspace</span>
          <h2>SIGGY market studio</h2>
          <p>
            Review generated markets, test mock adapters, edit deadlines, and
            prepare manual drafts. Contract settlement remains on Ritual Chain.
          </p>
        </div>
        <span className="dev-mode-badge">
          <FlaskConical size={14} /> DEV MODE
        </span>
      </div>

      <div className="admin-summary">
        {Object.entries(counts).map(([status, count]) => (
          <span key={status}>
            <b>{count}</b>
            {status}
          </span>
        ))}
        <button type="button" onClick={() => regenerate("live")} disabled={busy}>
          <RefreshCw size={14} /> Regenerate live
        </button>
        <button type="button" onClick={() => regenerate("mock")} disabled={busy}>
          <RotateCcw size={14} /> Test mock data
        </button>
      </div>
      {message ? <p className="admin-message">{message}</p> : null}

      <form className="manual-market-form" onSubmit={addManualMarket}>
        <label>
          <span>Manual market title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Will … before the deadline?"
            required
          />
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {["Crypto", "AI", "Ritual", "On-chain", "Macro", "World"].map(
              (value) => (
                <option key={value}>{value}</option>
              )
            )}
          </select>
        </label>
        <label>
          <span>Deadline</span>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            required
          />
        </label>
        <button type="submit">
          <Plus size={15} /> Add draft
        </button>
      </form>

      <div className="admin-market-list">
        {markets.map((market) => {
          const editing = market.id === editingId;
          return (
            <article key={market.id}>
              <div className="admin-market-status">
                <span>{market.publicationStatus ?? "APPROVED"}</span>
                <em>{market.dataMode ?? "LIVE"}</em>
              </div>
              {editing ? (
                <div className="admin-edit-fields">
                  <input
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                  />
                  <input
                    type="datetime-local"
                    value={editDeadline}
                    onChange={(event) => setEditDeadline(event.target.value)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="admin-market-title"
                  onClick={() => onSelect(market)}
                >
                  <small>{market.category}</small>
                  <strong>{market.question}</strong>
                </button>
              )}
              <div className="admin-actions">
                {editing ? (
                  <button
                    type="button"
                    onClick={() => {
                      update(market.id, {
                        question: editTitle,
                        endDate: editDeadline
                          ? new Date(editDeadline).toISOString()
                          : market.endDate,
                      });
                      setEditingId("");
                    }}
                  >
                    <Check size={14} /> Save
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(market.id);
                      setEditTitle(market.question);
                      setEditDeadline(
                        market.endDate ? market.endDate.slice(0, 16) : ""
                      );
                    }}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => update(market.id, { publicationStatus: "APPROVED" })}
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => update(market.id, { publicationStatus: "REJECTED" })}
                >
                  <X size={14} /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => update(market.id, { publicationStatus: "RESOLVED" })}
                >
                  Resolve
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
