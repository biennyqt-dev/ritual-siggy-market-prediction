export type AsyncStatus =
  | "IDLE"
  | "SUBMITTING"
  | "PENDING_COMMITMENT"
  | "COMMITTED"
  | "EXECUTOR_PROCESSING"
  | "RESULT_READY"
  | "PENDING_SETTLEMENT"
  | "SETTLED"
  | "FAILED"
  | "EXPIRED";

export interface PredictionMarket {
  id: string;
  question: string;
  slug: string;
  category: string;
  description: string;
  image?: string;
  endDate?: string;
  probability: number;
  volume: number;
  liquidity: number;
  change24h: number;
  tokenId?: string;
  sourceUrl: string;
  generated?: boolean;
  generatedAt?: string;
  confidenceScore?: number;
  yesOdds?: number;
  noOdds?: number;
  resolutionCriteria?: string;
  resolutionSource?: string;
  relevanceReason?: string;
  aiReasoning?: string;
  yesCase?: string;
  noCase?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  tags?: string[];
  supportingData?: MarketSupportingDatum[];
  sourceLabels?: string[];
  dataMode?: "LIVE" | "MIXED" | "MOCK";
  publicationStatus?: "DRAFT" | "APPROVED" | "REJECTED" | "RESOLVED";
  trendingScore?: number;
}

export interface MarketSupportingDatum {
  label: string;
  value: string;
  detail?: string;
  source: string;
  sourceUrl: string;
  observedAt: string;
  live: boolean;
}

export interface PricePoint {
  time: number;
  value: number;
}

export interface PositionRecord {
  id: string;
  marketId: string;
  marketKey?: `0x${string}`;
  question: string;
  side: "YES" | "NO";
  amount: number;
  probability: number;
  createdAt: number;
  closeTime?: number;
  resolvedAt?: number;
  status: "OPEN" | "WON" | "LOST";
  txHash?: string;
}

export interface NewsSignal {
  title: string;
  url: string;
  domain: string;
  seenAt?: string;
  relevance: number;
}
