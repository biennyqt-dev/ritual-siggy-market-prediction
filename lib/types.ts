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
