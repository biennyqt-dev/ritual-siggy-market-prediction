import type { Address } from "viem";
import { siggyAbi } from "@/lib/siggy-contract";
import {
  buildProtocolLeaderboard,
  type LeaderboardClaimEvent,
  type LeaderboardPredictionEvent,
  type LeaderboardResolutionEvent,
} from "@/lib/leaderboard";
import {
  blockAtOrAfterTimestamp,
  createProtocolClient,
  findDeploymentBlock,
} from "@/lib/protocol-stats-server";
import {
  timeframeStartTimestamp,
  type ProtocolTimeframe,
} from "@/lib/protocol-stats";

const CACHE_TTL_MS = 4_000;

export interface ProtocolLeaderboardResult {
  contractAddress: Address;
  contractConfigured: true;
  entries: Array<{
    address: Address;
    lastActive: string;
    rank: number;
    resolvedPredictions: number;
    totalVolumeWei: string;
    totalWins: number;
    winRate: number;
  }>;
  latestBlock: string;
  timeframe: ProtocolTimeframe;
  updatedAt: string;
}

interface CacheEntry {
  expiresAt: number;
  value: ProtocolLeaderboardResult;
}

const leaderboardCache = new Map<string, CacheEntry>();

export async function readProtocolLeaderboard(
  address: Address,
  timeframe: ProtocolTimeframe
): Promise<ProtocolLeaderboardResult> {
  const cacheKey = `${address}:${timeframe}`;
  const cached = leaderboardCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const client = createProtocolClient();
  const latest = await client.getBlock({ blockTag: "latest" });
  const latestBlock = latest.number;
  const deploymentBlock = await findDeploymentBlock(
    client,
    address,
    latestBlock
  );
  const startTimestamp = timeframeStartTimestamp(
    timeframe,
    Number(latest.timestamp)
  );
  const timeframeFromBlock =
    startTimestamp === null
      ? deploymentBlock
      : await blockAtOrAfterTimestamp(
          client,
          startTimestamp,
          deploymentBlock,
          latestBlock,
          latest
        );

  const [predictionLogs, resolutionLogs, claimLogs] = await Promise.all([
    client.getContractEvents({
      address,
      abi: siggyAbi,
      eventName: "PredictionPlaced",
      fromBlock: deploymentBlock,
      toBlock: latestBlock,
    }),
    client.getContractEvents({
      address,
      abi: siggyAbi,
      eventName: "MarketResolved",
      fromBlock: timeframeFromBlock,
      toBlock: latestBlock,
    }),
    client.getContractEvents({
      address,
      abi: siggyAbi,
      eventName: "WinningsClaimed",
      fromBlock: timeframeFromBlock,
      toBlock: latestBlock,
    }),
  ]);

  const timeframePredictionLogs = predictionLogs.filter(
    (log) => log.blockNumber >= timeframeFromBlock
  );
  const activityBlockNumbers = [
    ...timeframePredictionLogs.map((log) => log.blockNumber),
    ...claimLogs.map((log) => log.blockNumber),
  ];
  const uniqueActivityBlocks = [...new Set(activityBlockNumbers)];
  const activityBlocks = await Promise.all(
    uniqueActivityBlocks.map(async (blockNumber) => ({
      blockNumber,
      block: await client.getBlock({ blockNumber }),
    }))
  );
  const timestampByBlock = new Map(
    activityBlocks.map(({ block, blockNumber }) => [
      blockNumber,
      Number(block.timestamp),
    ])
  );

  const allPredictions: LeaderboardPredictionEvent[] = predictionLogs.map(
    (log) => ({ ...log.args })
  );
  const timeframePredictions: LeaderboardPredictionEvent[] =
    timeframePredictionLogs.map((log) => ({
      ...log.args,
      timestamp: timestampByBlock.get(log.blockNumber) ?? 0,
    }));
  const resolutions: LeaderboardResolutionEvent[] = resolutionLogs.map(
    (log) => ({ ...log.args })
  );
  const claims: LeaderboardClaimEvent[] = claimLogs.map((log) => ({
    ...log.args,
    timestamp: timestampByBlock.get(log.blockNumber) ?? 0,
  }));

  const entries = buildProtocolLeaderboard({
    allPredictions,
    claims,
    resolutions,
    timeframePredictions,
  }).map((entry) => ({
    address: entry.address,
    lastActive: new Date(entry.lastActive * 1_000).toISOString(),
    rank: entry.rank,
    resolvedPredictions: entry.resolvedPredictions,
    totalVolumeWei: entry.totalVolumeWei.toString(),
    totalWins: entry.totalWins,
    winRate: entry.winRateBps / 100,
  }));

  const value: ProtocolLeaderboardResult = {
    contractAddress: address,
    contractConfigured: true,
    entries,
    latestBlock: latestBlock.toString(),
    timeframe,
    updatedAt: new Date().toISOString(),
  };
  leaderboardCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  });
  return value;
}
