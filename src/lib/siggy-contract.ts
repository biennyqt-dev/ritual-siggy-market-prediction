import { keccak256, toHex, type Hex } from "viem";

export const siggyAbi = [
  {
    name: "MarketCreated",
    type: "event",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "question", type: "string", indexed: false },
      { name: "closeTime", type: "uint64", indexed: false },
    ],
  },
  {
    name: "PredictionPlaced",
    type: "event",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "yes", type: "bool", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "MarketResolved",
    type: "event",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "outcome", type: "bool", indexed: false },
      { name: "agentJobId", type: "bytes32", indexed: true },
    ],
  },
  {
    name: "WinningsClaimed",
    type: "event",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "enterMarket",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "question", type: "string" },
      { name: "closeTime", type: "uint64" },
      { name: "yes", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "markets",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [
      { name: "question", type: "string" },
      { name: "closeTime", type: "uint64" },
      { name: "yesPool", type: "uint128" },
      { name: "noPool", type: "uint128" },
      { name: "resolved", type: "bool" },
      { name: "outcome", type: "bool" },
      { name: "exists", type: "bool" },
    ],
  },
  { name: "InvalidMarket", type: "error", inputs: [] },
  { name: "MarketClosed", type: "error", inputs: [] },
] as const;

const DAY_SECONDS = 86_400;

export function marketCloseTime(endDate: string | undefined, nowSeconds: number) {
  const parsedEndTime = endDate
    ? Math.floor(Date.parse(endDate) / 1000)
    : Number.NaN;

  if (Number.isFinite(parsedEndTime) && parsedEndTime > nowSeconds + 60) {
    return parsedEndTime;
  }

  // Keep markets without a usable deadline in one stable 30-day round instead
  // of generating a different market ID on every click.
  return (Math.floor(nowSeconds / DAY_SECONDS) + 31) * DAY_SECONDS;
}

export function marketRoundKeys(
  marketId: string,
  closeTime: number,
  nowSeconds: number
): [Hex, Hex] {
  const canonical = keccak256(
    toHex(`siggy:v2:${marketId}:${closeTime}`)
  );
  const dailyRecovery = keccak256(
    toHex(
      `siggy:v2:${marketId}:${closeTime}:recovery:${Math.floor(
        nowSeconds / DAY_SECONDS
      )}`
    )
  );
  return [canonical, dailyRecovery];
}

export function bufferedGas(estimate: bigint) {
  const withThirtyPercentHeadroom = (estimate * 130n + 99n) / 100n;
  return withThirtyPercentHeadroom > 250_000n
    ? withThirtyPercentHeadroom
    : 250_000n;
}

function errorText(error: unknown) {
  const parts: string[] = [];
  let current: unknown = error;

  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (current instanceof Error) parts.push(current.message);
    if (typeof current === "object") {
      const value = current as {
        shortMessage?: unknown;
        details?: unknown;
        cause?: unknown;
      };
      if (typeof value.shortMessage === "string") parts.push(value.shortMessage);
      if (typeof value.details === "string") parts.push(value.details);
      current = value.cause;
    } else {
      parts.push(String(current));
      break;
    }
  }

  return parts.join(" ");
}

export function friendlyTradeError(error: unknown) {
  const text = errorText(error);
  const normalized = text.toLowerCase();

  if (
    normalized.includes("user rejected") ||
    normalized.includes("user denied")
  ) {
    return "Transaction cancelled in your wallet.";
  }
  if (text.includes("MarketClosed") || normalized.includes("market closed")) {
    return "This market is already closed on Ritual. Choose another active market.";
  }
  if (text.includes("InvalidMarket") || normalized.includes("invalid market")) {
    return "The amount or market data is invalid. Check the RITUAL amount and try again.";
  }
  if (
    normalized.includes("insufficient funds") ||
    normalized.includes("exceeds the balance")
  ) {
    return "Your wallet does not have enough RITUAL for this prediction and its network fee.";
  }
  if (
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("http request failed")
  ) {
    return "Ritual RPC is temporarily unavailable. Please retry in a moment.";
  }

  return "The Ritual transaction could not be completed. No position was recorded.";
}
