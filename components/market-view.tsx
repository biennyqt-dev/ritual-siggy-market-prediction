import type { MarketUIToolInvocation } from "@/tool/market-tool";

export default function MarketView({
  invocation,
}: {
  invocation: MarketUIToolInvocation;
}) {
  switch (invocation.state) {
    // example of pre-rendering streaming tool calls:
    case "input-streaming":
      return <pre>{JSON.stringify(invocation.input, null, 2)}</pre>;
    case "input-available":
      return (
        <div className="text-gray-500">
          Getting market information for {invocation.input.token}...
        </div>
      );
    case "output-available":
      return (
        <div className="text-gray-500">
          {invocation.output.state === "loading"
            ? "Fetching market information..."
            : `Market information for ${invocation.input.token}: ${invocation.output.marketData}`}
        </div>
      );
    case "output-error":
      return <div className="text-red-500">Error: {invocation.errorText}</div>;
  }
}
