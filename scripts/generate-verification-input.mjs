import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const sourcePath = path.resolve("contracts/src/SiggyPredictionMarket.sol");
const source = fs.readFileSync(sourcePath, "utf8");
const input = {
  language: "Solidity",
  sources: {
    "SiggyPredictionMarket.sol": {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

const outDir = path.resolve("verification");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "SiggyPredictionMarket.standard-json-input.json");
fs.writeFileSync(outPath, `${JSON.stringify(input, null, 2)}\n`);

console.log(`Compiler: v${solc.version().replace(".Emscripten.clang", "")}`);
console.log(`Standard JSON Input: ${outPath}`);
