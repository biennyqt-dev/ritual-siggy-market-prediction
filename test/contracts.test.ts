import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { describe, expect, it } from "vitest";
import { toFunctionSelector } from "viem";

describe("SIGGY Ritual contract", () => {
  const source = fs.readFileSync(
    path.resolve("contracts/src/SiggyPredictionMarket.sol"),
    "utf8"
  );

  it("compiles without Solidity errors", () => {
    const input = {
      language: "Solidity",
      sources: { "SiggyPredictionMarket.sol": { content: source } },
      settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
      },
    };
    const output = JSON.parse(solc.compile(JSON.stringify(input))) as {
      errors?: Array<{ severity: string; formattedMessage: string }>;
      contracts?: Record<string, unknown>;
    };
    const errors = (output.errors ?? []).filter(
      (error) => error.severity === "error"
    );
    expect(errors.map((error) => error.formattedMessage)).toEqual([]);
    expect(output.contracts?.["SiggyPredictionMarket.sol"]).toHaveProperty(
      "SiggyPredictionMarket"
    );
  });

  it("uses the canonical Ritual callback selector", () => {
    expect(
      toFunctionSelector("onSovereignAgentResult(bytes32,bytes)")
    ).toBe("0x8ca12055");
    expect(source).toContain(
      "0x5A16214fF555848411544b005f7Ac063742f39F6"
    );
    expect(source).toContain("address(0x080C)");
  });
});
