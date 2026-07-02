import { describe, expect, it } from "vitest";
import { parseEther } from "viem";
import {
  countOpenProtocolMarkets,
  formatProtocolVolume,
  normalizeProtocolContractAddress,
  resolveProtocolContractAddress,
  sumProtocolVolume,
  timeframeStartTimestamp,
} from "../src/lib/protocol-stats";

const MARKET_A = `0x${"a".repeat(64)}` as const;
const MARKET_B = `0x${"b".repeat(64)}` as const;
const MARKET_C = `0x${"c".repeat(64)}` as const;
const CONTRACT = "0x1234567890abcdef1234567890abcdef12345678";

describe("SIGGY protocol statistics", () => {
  it("counts only unique, unresolved markets whose close time is in the future", () => {
    expect(
      countOpenProtocolMarkets(
        [
          { marketId: MARKET_A, closeTime: 2_000n },
          { marketId: MARKET_A, closeTime: 2_000n },
          { marketId: MARKET_B, closeTime: 3_000n },
          { marketId: MARKET_C, closeTime: 900n },
        ],
        [{ marketId: MARKET_B }],
        1_000
      )
    ).toBe(1);
  });

  it("sums only recorded protocol event amounts and formats them as RIT", () => {
    const volume = sumProtocolVolume([
      { amount: parseEther("1000") },
      { amount: parseEther("2428") },
      {},
    ]);
    expect(volume).toBe(parseEther("3428"));
    expect(formatProtocolVolume(volume)).toBe("3,428 RIT");
  });

  it("supports 24-hour, 7-day, 30-day, and all-time windows", () => {
    const now = 10_000_000;
    expect(timeframeStartTimestamp("24h", now)).toBe(now - 86_400);
    expect(timeframeStartTimestamp("7d", now)).toBe(now - 604_800);
    expect(timeframeStartTimestamp("30d", now)).toBe(now - 2_592_000);
    expect(timeframeStartTimestamp("all", now)).toBeNull();
  });

  it("requires a non-zero EVM address and prefers the canonical env key", () => {
    expect(normalizeProtocolContractAddress("not-an-address")).toBeNull();
    expect(
      normalizeProtocolContractAddress(
        "0x0000000000000000000000000000000000000000"
      )
    ).toBeNull();
    expect(
      resolveProtocolContractAddress({
        SIGGY_RITUAL_CONTRACT_ADDRESS: CONTRACT,
        NEXT_PUBLIC_SIGGY_CONTRACT:
          "0x9999999999999999999999999999999999999999",
      })
    ).toBe("0x1234567890AbcdEF1234567890aBcdef12345678");
  });
});
