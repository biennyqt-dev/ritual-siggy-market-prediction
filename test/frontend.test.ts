import { describe, expect, it } from "vitest";

describe("SIGGY async lifecycle contract", () => {
  it("keeps every Ritual lifecycle state represented", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/types.ts", "utf8")
    );
    for (const status of [
      "SUBMITTING",
      "PENDING_COMMITMENT",
      "COMMITTED",
      "EXECUTOR_PROCESSING",
      "RESULT_READY",
      "PENDING_SETTLEMENT",
      "SETTLED",
      "FAILED",
      "EXPIRED",
    ]) {
      expect(source).toContain(`"${status}"`);
    }
  });

  it("keeps predictions open until an on-chain market resolution", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/components/siggy-dashboard.tsx", "utf8")
    );
    expect(source).not.toContain('status: "WON",');
    expect(source).toContain('functionName: "markets"');
    expect(source).toContain('position.status === "OPEN"');
  });

  it("ships theme, music, search, and RITUAL-denominated controls", async () => {
    const fs = await import("node:fs");
    const dashboard = fs.readFileSync("src/components/siggy-dashboard.tsx", "utf8");
    expect(dashboard).toContain("Switch to ${theme");
    expect(dashboard).toContain("/audio/siggy-arcade.mp3");
    expect(dashboard).toContain("/api/markets?q=");
    expect(dashboard).not.toContain("¢");
    expect(fs.statSync("public/audio/siggy-arcade.mp3").size).toBeGreaterThan(
      1_000_000
    );
  });

  it("ships the SIGGY logo, sourced alerts, and dark-card contrast fix", async () => {
    const fs = await import("node:fs");
    const dashboard = fs.readFileSync("src/components/siggy-dashboard.tsx", "utf8");
    const styles = fs.readFileSync("app/globals.css", "utf8");

    expect(fs.statSync("public/siggy-logo.webp").size).toBeGreaterThan(10_000);
    expect(dashboard).toContain("/siggy-logo.webp");
    expect(dashboard).toContain('setActiveView("alerts")');
    expect(dashboard).toContain("Polymarket Gamma");
    expect(dashboard).toContain("GDELT News");
    expect(dashboard).toContain("Ritual Chain");
    expect(styles).toContain(
      'html[data-theme="dark"] .agent-card strong'
    );
    expect(styles).toContain("color: #06150d");
  });

  it("preflights predictions and uses buffered chain gas", async () => {
    const fs = await import("node:fs");
    const dashboard = fs.readFileSync("src/components/siggy-dashboard.tsx", "utf8");
    const contract = fs.readFileSync("src/lib/siggy-contract.ts", "utf8");

    expect(dashboard).toContain("estimateContractGas");
    expect(dashboard).toContain('blockTag: "latest"');
    expect(dashboard).toContain("marketRoundKeys");
    expect(dashboard).toContain('functionName: "markets"');
    expect(dashboard).toContain("bufferedGas(gasEstimate)");
    expect(dashboard).not.toContain("gas: 350_000n");
    expect(contract).toContain('{ name: "MarketClosed", type: "error"');
  });

  it("uses live providers without fabricated market or chart fallbacks", async () => {
    const fs = await import("node:fs");
    const dashboard = fs.readFileSync("src/components/siggy-dashboard.tsx", "utf8");
    const chart = fs.readFileSync("src/components/market-chart.tsx", "utf8");
    const marketsRoute = fs.readFileSync("app/api/markets/route.ts", "utf8");
    const historyRoute = fs.readFileSync(
      "app/api/market-history/route.ts",
      "utf8"
    );
    const intelRoute = fs.readFileSync("app/api/intel/route.ts", "utf8");
    const gdelt = fs.readFileSync("src/lib/gdelt.ts", "utf8");

    expect(dashboard).not.toContain("fallbackMarkets");
    expect(dashboard).not.toContain("Resilient preview");
    expect(dashboard).toContain(
      "wss://ws-subscriptions-clob.polymarket.com/ws/market"
    );
    expect(dashboard).toContain("No demo values are being shown.");
    expect(chart).not.toContain("Math.sin");
    expect(chart).not.toContain("Array.from({ length:");
    expect(marketsRoute).toContain('cache: "no-store"');
    expect(historyRoute).toContain('cache: "no-store"');
    expect(intelRoute).toContain('cache: "no-store"');
    expect(intelRoute).not.toContain("SIGGY research preview");
    expect(gdelt).toContain("(matched / terms.length) * 100");
  });

  it("uses only SIGGY contract events for dashboard protocol statistics", async () => {
    const fs = await import("node:fs");
    const dashboard = fs.readFileSync("src/components/siggy-dashboard.tsx", "utf8");
    const statsRoute = fs.readFileSync(
      "app/api/protocol-stats/route.ts",
      "utf8"
    );
    const statsServer = fs.readFileSync(
      "src/lib/protocol-stats-server.ts",
      "utf8"
    );

    expect(dashboard).toContain("/api/protocol-stats?timeframe=");
    expect(dashboard).toContain("formatProtocolVolume");
    expect(dashboard).not.toContain(
      "markets.reduce((sum, market) => sum + market.volume"
    );
    expect(statsRoute).toContain("configuredProtocolAddress");
    expect(statsServer).toContain('eventName: "MarketCreated"');
    expect(statsServer).toContain('eventName: "MarketResolved"');
    expect(statsServer).toContain('eventName: "PredictionPlaced"');
    expect(statsServer).not.toContain("Polymarket");
    expect(statsServer).not.toContain("Math.random");
  });

  it("shows the transaction warning only for an invalid SIGGY contract", async () => {
    const fs = await import("node:fs");
    const dashboard = fs.readFileSync("src/components/siggy-dashboard.tsx", "utf8");
    const statsRoute = fs.readFileSync(
      "app/api/protocol-stats/route.ts",
      "utf8"
    );

    expect(dashboard).toContain(
      "Transactions are disabled until the SIGGY Ritual contract is configured."
    );
    expect(dashboard).toContain('protocolStatsStatus === "loading"');
    expect(dashboard).toContain("contractConfigured");
    expect(statsRoute).toContain("protocolContractHasCode");
    expect(statsRoute).toContain("missing-or-invalid-contract-address");
    expect(statsRoute).toContain("address-has-no-contract-code");
  });
});
