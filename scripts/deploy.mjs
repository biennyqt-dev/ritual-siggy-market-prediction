import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
  throw new Error(
    "Set PRIVATE_KEY in a local environment file or terminal. Never paste it into chat."
  );
}

const sourcePath = path.resolve("contracts/src/SiggyPredictionMarket.sol");
const source = fs.readFileSync(sourcePath, "utf8");
const input = {
  language: "Solidity",
  sources: { "SiggyPredictionMarket.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((item) => item.severity === "error");
if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join("\n"));

const artifact =
  output.contracts["SiggyPredictionMarket.sol"].SiggyPredictionMarket;
const chain = defineChain({
  id: 1979,
  name: "Ritual",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org"],
    },
  },
});
const account = privateKeyToAccount(privateKey);
const transport = http(chain.rpcUrls.default.http[0]);
const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ account, chain, transport });

const hash = await walletClient.deployContract({
  account,
  abi: artifact.abi,
  bytecode: `0x${artifact.evm.bytecode.object}`,
  args: [account.address],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`SIGGY_RITUAL_CONTRACT_ADDRESS=${receipt.contractAddress}`);
console.log(
  `SIGGY_RITUAL_CONTRACT_DEPLOYMENT_BLOCK=${receipt.blockNumber.toString()}`
);
console.log(`TX_HASH=${hash}`);
