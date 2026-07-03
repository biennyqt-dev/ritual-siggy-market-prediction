import {
  createPublicClient,
  http,
  type Address,
  type Block,
  type PublicClient,
} from "viem";
import { ritualChain } from "@/lib/ritual";
import { siggyAbi } from "@/lib/siggy-contract";
import {
  countOpenProtocolMarkets,
  resolveProtocolContractAddress,
  sumProtocolVolume,
  timeframeStartTimestamp,
  type ProtocolTimeframe,
} from "@/lib/protocol-stats";

const CACHE_TTL_MS = 4_000;

export interface ProtocolStatsResult {
  activeMarkets: number;
  contractAddress: Address;
  contractConfigured: true;
  latestBlock: string;
  timeframe: ProtocolTimeframe;
  updatedAt: string;
  volumeWei: string;
}

interface CacheEntry {
  expiresAt: number;
  value: ProtocolStatsResult;
}

const statsCache = new Map<string, CacheEntry>();
const deploymentBlockCache = new Map<Address, bigint>();

export function createProtocolClient() {
  return createPublicClient({
    chain: ritualChain,
    transport: http(
      process.env.RITUAL_RPC_URL ??
        process.env.NEXT_PUBLIC_RITUAL_RPC_URL ??
        "https://rpc.ritualfoundation.org"
    ),
  });
}

async function hasCodeAt(
  client: PublicClient,
  address: Address,
  blockNumber: bigint
) {
  try {
    const bytecode = await client.getBytecode({ address, blockNumber });
    return Boolean(bytecode && bytecode !== "0x");
  } catch {
    return false;
  }
}

export async function findDeploymentBlock(
  client: PublicClient,
  address: Address,
  latestBlock: bigint
) {
  const configured = process.env.SIGGY_RITUAL_CONTRACT_DEPLOYMENT_BLOCK;
  if (configured && /^\d+$/.test(configured)) {
    return BigInt(configured);
  }

  const cached = deploymentBlockCache.get(address);
  if (cached !== undefined) return cached;

  let low = 0n;
  let high = latestBlock;
  while (low < high) {
    const middle = (low + high) / 2n;
    if (await hasCodeAt(client, address, middle)) {
      high = middle;
    } else {
      low = middle + 1n;
    }
  }
  deploymentBlockCache.set(address, low);
  return low;
}

export async function blockAtOrAfterTimestamp(
  client: PublicClient,
  timestamp: number,
  deploymentBlock: bigint,
  latestBlock: bigint,
  latest: Block
) {
  if (Number(latest.timestamp) < timestamp) return latestBlock;
  const deployed = await client.getBlock({ blockNumber: deploymentBlock });
  if (Number(deployed.timestamp) >= timestamp) return deploymentBlock;

  let low = deploymentBlock;
  let high = latestBlock;
  while (low < high) {
    const middle = (low + high) / 2n;
    const block = await client.getBlock({ blockNumber: middle });
    if (Number(block.timestamp) < timestamp) {
      low = middle + 1n;
    } else {
      high = middle;
    }
  }
  return low;
}

export function configuredProtocolAddress() {
  return resolveProtocolContractAddress(process.env);
}

export async function protocolContractHasCode(address: Address) {
  const client = createProtocolClient();
  const bytecode = await client.getBytecode({ address });
  return Boolean(bytecode && bytecode !== "0x");
}

export async function readProtocolStats(
  address: Address,
  timeframe: ProtocolTimeframe
): Promise<ProtocolStatsResult> {
  const cacheKey = `${address}:${timeframe}`;
  const cached = statsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const client = createProtocolClient();
  const latest = await client.getBlock({ blockTag: "latest" });
  const latestBlock = latest.number;
  const deploymentBlock = await findDeploymentBlock(
    client,
    address,
    latestBlock
  );
  const nowSeconds = Number(latest.timestamp);
  const startTimestamp = timeframeStartTimestamp(timeframe, nowSeconds);
  const volumeFromBlock =
    startTimestamp === null
      ? deploymentBlock
      : await blockAtOrAfterTimestamp(
          client,
          startTimestamp,
          deploymentBlock,
          latestBlock,
          latest
        );

  const [createdLogs, resolvedLogs, predictionLogs] = await Promise.all([
    client.getContractEvents({
      address,
      abi: siggyAbi,
      eventName: "MarketCreated",
      fromBlock: deploymentBlock,
      toBlock: latestBlock,
    }),
    client.getContractEvents({
      address,
      abi: siggyAbi,
      eventName: "MarketResolved",
      fromBlock: deploymentBlock,
      toBlock: latestBlock,
    }),
    client.getContractEvents({
      address,
      abi: siggyAbi,
      eventName: "PredictionPlaced",
      fromBlock: volumeFromBlock,
      toBlock: latestBlock,
    }),
  ]);

  const value: ProtocolStatsResult = {
    activeMarkets: countOpenProtocolMarkets(
      createdLogs.map((log) => log.args),
      resolvedLogs.map((log) => log.args),
      nowSeconds
    ),
    contractAddress: address,
    contractConfigured: true,
    latestBlock: latestBlock.toString(),
    timeframe,
    updatedAt: new Date().toISOString(),
    volumeWei: sumProtocolVolume(
      predictionLogs.map((log) => log.args)
    ).toString(),
  };
  statsCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  });
  return value;
}
