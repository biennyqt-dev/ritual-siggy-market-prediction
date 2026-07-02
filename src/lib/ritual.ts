import { defineChain } from "viem";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

export const ritualChain = defineChain({
  id: 1979,
  name: "Ritual",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RITUAL_RPC_URL ??
          "https://rpc.ritualfoundation.org",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Ritual Explorer",
      url: "https://explorer.ritualfoundation.org",
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [ritualChain],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [ritualChain.id]: http(
      process.env.NEXT_PUBLIC_RITUAL_RPC_URL ??
        "https://rpc.ritualfoundation.org"
    ),
  },
  ssr: true,
});

export const RITUAL_ADDRESSES = {
  wallet: "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948",
  asyncJobTracker: "0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5",
  asyncDelivery: "0x5A16214fF555848411544b005f7Ac063742f39F6",
  teeRegistry: "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F",
  sovereignFactory: "0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304",
  sovereignAgent: "0x000000000000000000000000000000000000080C",
} as const;
