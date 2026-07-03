import type { Address, Hex } from "viem";

export interface LeaderboardPredictionEvent {
  amount?: bigint;
  marketId?: Hex;
  timestamp?: number;
  user?: Address;
  yes?: boolean;
}

export interface LeaderboardResolutionEvent {
  marketId?: Hex;
  outcome?: boolean;
}

export interface LeaderboardClaimEvent {
  marketId?: Hex;
  timestamp?: number;
  user?: Address;
}

export interface LeaderboardEntry {
  address: Address;
  lastActive: number;
  rank: number;
  resolvedPredictions: number;
  totalVolumeWei: bigint;
  totalWins: number;
  winRateBps: number;
}

interface Position {
  noAmount: bigint;
  yesAmount: bigint;
}

interface UserAggregate {
  address: Address;
  lastActive: number;
  resolvedPredictions: number;
  totalVolumeWei: bigint;
  totalWins: number;
}

export function buildProtocolLeaderboard({
  allPredictions,
  claims,
  resolutions,
  timeframePredictions,
}: {
  allPredictions: LeaderboardPredictionEvent[];
  claims: LeaderboardClaimEvent[];
  resolutions: LeaderboardResolutionEvent[];
  timeframePredictions: LeaderboardPredictionEvent[];
}): LeaderboardEntry[] {
  const positionsByMarket = new Map<string, Map<string, Position>>();
  const addressByKey = new Map<string, Address>();

  for (const prediction of allPredictions) {
    if (
      !prediction.marketId ||
      !prediction.user ||
      prediction.amount === undefined ||
      prediction.yes === undefined ||
      prediction.amount <= 0n
    ) {
      continue;
    }
    const marketKey = prediction.marketId.toLowerCase();
    const userKey = prediction.user.toLowerCase();
    const marketPositions =
      positionsByMarket.get(marketKey) ?? new Map<string, Position>();
    const position = marketPositions.get(userKey) ?? {
      noAmount: 0n,
      yesAmount: 0n,
    };
    if (prediction.yes) position.yesAmount += prediction.amount;
    else position.noAmount += prediction.amount;
    marketPositions.set(userKey, position);
    positionsByMarket.set(marketKey, marketPositions);
    addressByKey.set(userKey, prediction.user);
  }

  const users = new Map<string, UserAggregate>();
  const getUser = (userKey: string) => {
    const address = addressByKey.get(userKey);
    if (!address) return null;
    const existing = users.get(userKey);
    if (existing) return existing;
    const aggregate: UserAggregate = {
      address,
      lastActive: 0,
      resolvedPredictions: 0,
      totalVolumeWei: 0n,
      totalWins: 0,
    };
    users.set(userKey, aggregate);
    return aggregate;
  };

  for (const prediction of timeframePredictions) {
    if (
      !prediction.user ||
      prediction.amount === undefined ||
      prediction.amount <= 0n
    ) {
      continue;
    }
    const userKey = prediction.user.toLowerCase();
    addressByKey.set(userKey, prediction.user);
    const aggregate = getUser(userKey);
    if (!aggregate) continue;
    aggregate.totalVolumeWei += prediction.amount;
    aggregate.lastActive = Math.max(
      aggregate.lastActive,
      prediction.timestamp ?? 0
    );
  }

  const resolvedOutcomes = new Map<string, boolean>();
  for (const resolution of resolutions) {
    if (!resolution.marketId || resolution.outcome === undefined) continue;
    resolvedOutcomes.set(resolution.marketId.toLowerCase(), resolution.outcome);
  }

  for (const [marketKey, outcome] of resolvedOutcomes) {
    const marketPositions = positionsByMarket.get(marketKey);
    if (!marketPositions) continue;
    for (const [userKey, position] of marketPositions) {
      if (position.yesAmount + position.noAmount <= 0n) continue;
      const aggregate = getUser(userKey);
      if (!aggregate) continue;
      aggregate.resolvedPredictions += 1;
      const winningStake = outcome ? position.yesAmount : position.noAmount;
      if (winningStake > 0n) aggregate.totalWins += 1;
    }
  }

  for (const claim of claims) {
    if (!claim.user) continue;
    const userKey = claim.user.toLowerCase();
    addressByKey.set(userKey, claim.user);
    const aggregate = getUser(userKey);
    if (!aggregate) continue;
    aggregate.lastActive = Math.max(
      aggregate.lastActive,
      claim.timestamp ?? 0
    );
  }

  const ranked = [...users.values()]
    .filter((user) => user.totalWins > 0 && user.totalVolumeWei > 0n)
    .map((user) => ({
      ...user,
      rank: 0,
      winRateBps:
        user.resolvedPredictions > 0
          ? Math.round((user.totalWins / user.resolvedPredictions) * 10_000)
          : 0,
    }))
    .sort((a, b) => {
      if (a.totalVolumeWei !== b.totalVolumeWei) {
        return a.totalVolumeWei > b.totalVolumeWei ? -1 : 1;
      }
      if (a.totalWins !== b.totalWins) return b.totalWins - a.totalWins;
      if (a.winRateBps !== b.winRateBps) return b.winRateBps - a.winRateBps;
      return a.address.localeCompare(b.address);
    });

  return ranked.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
