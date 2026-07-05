export type SignalCategory =
  | "Crypto"
  | "AI"
  | "Ritual"
  | "On-chain"
  | "DeFi"
  | "Macro"
  | "World"
  | "Sports & Entertainment"
  | "Social";

export type SignalKind =
  | "price"
  | "percentage"
  | "count"
  | "gas"
  | "tvl"
  | "headline"
  | "sentiment"
  | "block";

export interface MarketSignal {
  id: string;
  category: SignalCategory;
  kind: SignalKind;
  provider: string;
  title: string;
  metric: string;
  currentValue: number;
  previousValue?: number;
  unit: string;
  observedAt: string;
  sourceUrl: string;
  resolutionSource: string;
  live: boolean;
  trustScore: number;
  tags: string[];
  detail: string;
}

export interface DataSourceResult {
  provider: string;
  status: "live" | "fallback" | "unavailable";
  signals: MarketSignal[];
  error?: string;
  updatedAt: string;
}

export interface DataSourceAdapter {
  id: string;
  collect(now: Date): Promise<DataSourceResult>;
}
