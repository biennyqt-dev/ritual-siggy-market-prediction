import {
  createPublicClient,
  defineChain,
  formatEther,
  http,
} from "viem";

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
const client = createPublicClient({
  chain,
  transport: http(chain.rpcUrls.default.http[0]),
});

const wallet = "0x6cdD0392DDEA911470471F2eD4Df3318E8E2889a";
const ritualWallet = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948";
const factory = "0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304";
const registry = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F";

const balanceAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

const registryAbi = [
  {
    name: "getServicesByCapability",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "capability", type: "uint8" },
      { name: "checkValidity", type: "bool" },
    ],
    outputs: [
      {
        type: "tuple[]",
        components: [
          {
            name: "node",
            type: "tuple",
            components: [
              { name: "paymentAddress", type: "address" },
              { name: "teeAddress", type: "address" },
              { name: "teeType", type: "uint8" },
              { name: "publicKey", type: "bytes" },
              { name: "endpoint", type: "string" },
              { name: "certPubKeyHash", type: "bytes32" },
              { name: "capability", type: "uint8" },
            ],
          },
          { name: "isValid", type: "bool" },
          { name: "workloadId", type: "bytes32" },
        ],
      },
    ],
  },
];

const [chainId, blockNumber, factoryCode, nativeBalance, escrow, services] =
  await Promise.all([
    client.getChainId(),
    client.getBlockNumber(),
    client.getCode({ address: factory }),
    client.getBalance({ address: wallet }),
    client.readContract({
      address: ritualWallet,
      abi: balanceAbi,
      functionName: "balanceOf",
      args: [wallet],
    }),
    client.readContract({
      address: registry,
      abi: registryAbi,
      functionName: "getServicesByCapability",
      args: [0, true],
    }),
  ]);

console.log(
  JSON.stringify(
    {
      chainId,
      blockNumber: blockNumber.toString(),
      sovereignFactoryDeployed: Boolean(factoryCode && factoryCode !== "0x"),
      wallet,
      nativeRitual: formatEther(nativeBalance),
      ritualWalletDeposit: formatEther(escrow),
      validHttpAgentExecutors: services.filter((service) => service.isValid)
        .length,
    },
    null,
    2
  )
);
