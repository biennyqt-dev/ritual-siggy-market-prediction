import { describe, expect, it } from "vitest";
import { parseEther, type Address, type Hex } from "viem";
import { buildProtocolLeaderboard } from "../src/lib/leaderboard";

const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const BOB = "0x2222222222222222222222222222222222222222" as Address;
const CAROL = "0x3333333333333333333333333333333333333333" as Address;
const MARKET_A = `0x${"aa".repeat(32)}` as Hex;
const MARKET_B = `0x${"bb".repeat(32)}` as Hex;
const MARKET_OPEN = `0x${"cc".repeat(32)}` as Hex;

describe("SIGGY protocol leaderboard", () => {
  it("includes only wallets with confirmed wins and timeframe volume", () => {
    const allPredictions = [
      {
        amount: parseEther("10"),
        marketId: MARKET_A,
        user: ALICE,
        yes: true,
      },
      {
        amount: parseEther("5"),
        marketId: MARKET_B,
        user: ALICE,
        yes: false,
      },
      {
        amount: parseEther("20"),
        marketId: MARKET_A,
        user: BOB,
        yes: false,
      },
      {
        amount: parseEther("100"),
        marketId: MARKET_OPEN,
        user: BOB,
        yes: true,
      },
    ];

    const result = buildProtocolLeaderboard({
      allPredictions,
      claims: [{ marketId: MARKET_A, timestamp: 500, user: ALICE }],
      resolutions: [
        { marketId: MARKET_A, outcome: true },
        { marketId: MARKET_B, outcome: true },
      ],
      timeframePredictions: allPredictions.map((prediction, index) => ({
        ...prediction,
        timestamp: 100 + index,
      })),
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      address: ALICE,
      lastActive: 500,
      rank: 1,
      resolvedPredictions: 2,
      totalWins: 1,
      winRateBps: 5_000,
    });
    expect(result[0].totalVolumeWei).toBe(parseEther("15"));
  });

  it("counts eligible unclaimed winners without counting open markets", () => {
    const oldWinningPosition = {
      amount: parseEther("3"),
      marketId: MARKET_A,
      user: ALICE,
      yes: true,
    };
    const currentVolume = {
      amount: parseEther("2"),
      marketId: MARKET_OPEN,
      timestamp: 800,
      user: ALICE,
      yes: false,
    };

    const result = buildProtocolLeaderboard({
      allPredictions: [oldWinningPosition, currentVolume],
      claims: [],
      resolutions: [{ marketId: MARKET_A, outcome: true }],
      timeframePredictions: [currentVolume],
    });

    expect(result).toHaveLength(1);
    expect(result[0].totalWins).toBe(1);
    expect(result[0].resolvedPredictions).toBe(1);
    expect(result[0].totalVolumeWei).toBe(parseEther("2"));
  });

  it("sorts by volume, then wins, then win rate", () => {
    const predictions = [
      { amount: parseEther("11"), marketId: MARKET_A, user: CAROL, yes: true },
      { amount: parseEther("10"), marketId: MARKET_A, user: ALICE, yes: true },
      { amount: parseEther("5"), marketId: MARKET_A, user: BOB, yes: true },
      { amount: parseEther("5"), marketId: MARKET_B, user: BOB, yes: false },
    ];

    const result = buildProtocolLeaderboard({
      allPredictions: predictions,
      claims: [],
      resolutions: [
        { marketId: MARKET_A, outcome: true },
        { marketId: MARKET_B, outcome: false },
      ],
      timeframePredictions: predictions,
    });

    expect(result.map((entry) => entry.address)).toEqual([
      CAROL,
      BOB,
      ALICE,
    ]);
    expect(result.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(result[1].totalWins).toBe(2);
    expect(result[1].winRateBps).toBe(10_000);
  });

  it("returns no rows when no market has a final winning user", () => {
    const prediction = {
      amount: parseEther("1"),
      marketId: MARKET_OPEN,
      timestamp: 100,
      user: ALICE,
      yes: true,
    };

    expect(
      buildProtocolLeaderboard({
        allPredictions: [prediction],
        claims: [],
        resolutions: [],
        timeframePredictions: [prediction],
      })
    ).toEqual([]);
  });
});
