"use client";

import { Check, ChevronDown, LogOut, Wallet } from "lucide-react";
import { useState } from "react";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { formatEther } from "viem";
import { ritualChain } from "@/lib/ritual";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const [open, setOpen] = useState(false);
  const { address, chainId, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    query: { enabled: Boolean(address), refetchInterval: 5_000 },
  });
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  if (isConnected && address) {
    if (chainId !== ritualChain.id) {
      return (
        <button
          type="button"
          className="wallet-button warning"
          onClick={() => switchChain({ chainId: ritualChain.id })}
          disabled={isSwitching}
        >
          {isSwitching ? "Switching…" : "Switch to Ritual"}
        </button>
      );
    }

    return (
      <div className="wallet-menu">
        <button
          type="button"
          className="wallet-button connected"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span className="status-dot" />
          {balance ? `${Number(formatEther(balance.value)).toFixed(3)} RITUAL` : ""}
          {shortAddress(address)}
          <ChevronDown size={15} />
        </button>
        {open ? (
          <div className="wallet-popover">
            <div>
              <span className="eyebrow">Network</span>
              <strong>
                <Check size={14} /> Ritual Testnet
              </strong>
            </div>
            <button
              type="button"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
            >
              <LogOut size={15} /> Disconnect
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  const connector = connectors[0];
  return (
    <button
      type="button"
      className="wallet-button"
      onClick={() => connector && connect({ connector })}
      disabled={!connector || isPending}
    >
      <Wallet size={16} />
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
