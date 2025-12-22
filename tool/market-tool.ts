import { UIToolInvocation, tool } from "ai";
import { z } from "zod";

export const marketTool = tool({
  description: "Get the market data for a given crypto token",
  inputSchema: z.object({ token: z.string() }),
  async *execute({ token }: { token: string }) {
    yield { state: "loading" as const };

    // Add artificial delay of 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate market data
    // In a real implementation, you would use a real API to get the market data
    const marketData = {
      price: 100,
      marketCap: 1000000000,
      volume: 1000000000,
      change: 0.01,
      changePercentage: 1,
      lastUpdated: new Date(),
    };
    yield {
      state: "ready" as const,
      temperature: 0,
      marketData: JSON.stringify(marketData),
    };
  },
});

export type MarketUIToolInvocation = UIToolInvocation<typeof marketTool>;
