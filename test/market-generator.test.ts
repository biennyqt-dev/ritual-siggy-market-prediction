import { describe, expect, it } from "vitest";
import { generateDailyMarkets } from "@/lib/market-generator";
import {
  evaluateMarketQuality,
  normalizeQuestion,
  removeDuplicateMarkets,
} from "@/lib/market-generator/quality";
import { confidenceHistory } from "@/lib/market-generator/history";

describe("SIGGY daily market generator", () => {
  it("generates fresh, objective markets from mock-compatible adapters", async () => {
    const now = new Date("2026-07-05T12:00:00.000Z");
    const batch = await generateDailyMarkets({
      now,
      force: true,
      forceMock: true,
    });

    expect(batch.dataMode).toBe("MOCK");
    expect(batch.markets.length).toBeGreaterThanOrEqual(3);
    for (const market of batch.markets) {
      expect(market.generated).toBe(true);
      expect(market.question).toMatch(/^Will /);
      expect(new Date(market.endDate!).getTime()).toBeGreaterThan(now.getTime());
      expect(market.resolutionCriteria).toContain("Resolve YES");
      expect(market.resolutionSource).toBeTruthy();
      expect(market.supportingData?.length).toBeGreaterThan(0);
      expect(market.yesOdds! + market.noOdds!).toBe(100);
      expect(evaluateMarketQuality(market, now).passed).toBe(true);
    }
  });

  it("removes normalized duplicate questions", async () => {
    const batch = await generateDailyMarkets({
      now: new Date("2026-07-05T12:00:00.000Z"),
      force: true,
      forceMock: true,
    });
    const first = batch.markets[0];
    const duplicates = removeDuplicateMarkets([
      first,
      { ...first, id: `${first.id}-copy`, question: first.question.replace("60000", "61000") },
    ]);
    expect(normalizeQuestion(first.question)).toBe(
      normalizeQuestion(first.question.replace("60000", "61000"))
    );
    expect(duplicates).toHaveLength(1);
  });

  it("creates stable confidence history ending at the current score", () => {
    const now = new Date("2026-07-05T12:00:00.000Z");
    const history = confidenceHistory("siggy-test", 63, now);
    expect(history).toHaveLength(25);
    expect(history.at(-1)?.value).toBe(63);
    expect(history.every((point) => point.value >= 5 && point.value <= 95)).toBe(
      true
    );
  });
});
