import { describe, expect, it } from "vitest";
import {
  marketCloseTime,
  marketRoundKeys,
} from "../lib/siggy-contract";

describe("SIGGY market rounds", () => {
  const now = Math.floor(Date.parse("2026-07-01T12:00:00Z") / 1000);

  it("uses an active provider deadline", () => {
    expect(marketCloseTime("2026-09-01T00:00:00Z", now)).toBe(
      Math.floor(Date.parse("2026-09-01T00:00:00Z") / 1000)
    );
  });

  it("uses a stable fallback deadline throughout the same UTC day", () => {
    expect(marketCloseTime(undefined, now)).toBe(
      marketCloseTime(undefined, now + 10_000)
    );
  });

  it("versions new rounds away from expired legacy market IDs", () => {
    const closeTime = marketCloseTime(undefined, now);
    const first = marketRoundKeys("legacy-market", closeTime, now);
    const second = marketRoundKeys("legacy-market", closeTime, now);

    expect(first).toEqual(second);
    expect(first[0]).toMatch(/^0x[0-9a-f]{64}$/);
    expect(first[0]).not.toBe(first[1]);
  });
});
