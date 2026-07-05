import type {
  DataSourceAdapter,
  DataSourceResult,
  MarketSignal,
} from "@/lib/data-sources/types";
import { fetchJson } from "@/lib/data-sources/utils";

interface RpcResult<T> {
  result?: T;
  error?: { message?: string };
}

async function rpc<T>(url: string, method: string, params: unknown[]) {
  const payload = await fetchJson<RpcResult<T>>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (payload.error || payload.result === undefined) {
    throw new Error(payload.error?.message || `${method} returned no result`);
  }
  return payload.result;
}

export const onchainAdapter: DataSourceAdapter = {
  id: "onchain",
  async collect(now): Promise<DataSourceResult> {
    const ritualRpc =
      process.env.RITUAL_RPC_URL || "https://rpc.ritualfoundation.org";
    const ethereumRpc =
      process.env.ETHEREUM_RPC_URL || "https://ethereum-rpc.publicnode.com";
    const [ritualBlock, ethereumGas] = await Promise.all([
      rpc<string>(ritualRpc, "eth_blockNumber", []),
      rpc<string>(ethereumRpc, "eth_gasPrice", []),
    ]);
    const blockNumber = Number(BigInt(ritualBlock));
    const gasGwei = Number(BigInt(ethereumGas)) / 1e9;
    const signals: MarketSignal[] = [
      {
        id: "ritual-block-height",
        category: "Ritual",
        kind: "block",
        provider: "Ritual RPC",
        title: "Ritual Chain block production",
        metric: "Ritual latest block",
        currentValue: blockNumber,
        unit: "block",
        observedAt: now.toISOString(),
        sourceUrl: "https://explorer.ritualfoundation.org",
        resolutionSource: "Ritual Chain RPC and block explorer",
        live: true,
        trustScore: 98,
        tags: ["ritual", "on-chain", "blocks"],
        detail: `Latest observed Ritual block ${blockNumber.toLocaleString()}`,
      },
      {
        id: "ethereum-gas",
        category: "On-chain",
        kind: "gas",
        provider: "Ethereum RPC",
        title: "Ethereum network gas",
        metric: "Ethereum gas price",
        currentValue: gasGwei,
        unit: "gwei",
        observedAt: now.toISOString(),
        sourceUrl: "https://etherscan.io/gastracker",
        resolutionSource: "Ethereum JSON-RPC eth_gasPrice at the stated deadline",
        live: true,
        trustScore: 93,
        tags: ["ethereum", "gas", "on-chain"],
        detail: `Latest eth_gasPrice ${gasGwei.toFixed(2)} gwei`,
      },
    ];

    return {
      provider: "Ritual + Ethereum RPC",
      status: "live",
      signals,
      updatedAt: now.toISOString(),
    };
  },
};
