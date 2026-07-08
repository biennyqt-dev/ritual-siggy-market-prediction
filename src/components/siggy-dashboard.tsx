"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bot,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  History,
  LayoutDashboard,
  Moon,
  Radio,
  Search,
  Share2,
  Sparkles,
  Sun,
  Trophy,
  TrendingUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  encodeFunctionData,
  formatEther,
  parseEther,
  type Address,
} from "viem";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useSendTransaction,
  useSwitchChain,
} from "wagmi";
import { AdminMarketPanel } from "@/components/AdminMarketPanel";
import { MarketDashboard } from "@/components/MarketDashboard";
import { MarketDetails } from "@/components/MarketDetails";
import { MarketChart } from "@/components/market-chart";
import { ShareWin } from "@/components/share-win";
import { WalletButton } from "@/components/wallet-button";
import {
  formatProtocolVolume,
  PROTOCOL_TIMEFRAME_LABELS,
  PROTOCOL_TIMEFRAMES,
  type ProtocolTimeframe,
} from "@/lib/protocol-stats";
import {
  bufferedGas,
  friendlyTradeError,
  marketCloseTime,
  marketRoundKeys,
  siggyAbi,
} from "@/lib/siggy-contract";
import { ritualChain } from "@/lib/ritual";
import type {
  AsyncStatus,
  NewsSignal,
  PositionRecord,
  PredictionMarket,
  PricePoint,
} from "@/lib/types";

type LiveStatus = "loading" | "live" | "delayed";
type StreamStatus = "connecting" | "live" | "offline";
type ProtocolStatsStatus = "loading" | "live" | "delayed" | "unconfigured";
type LeaderboardStatus = "loading" | "live" | "delayed" | "unconfigured";

interface ProtocolStatsResponse {
  activeMarkets: number | null;
  contractAddress: Address | null;
  contractConfigured: boolean;
  error?: string;
  latestBlock?: string;
  timeframe: ProtocolTimeframe;
  updatedAt: string;
  volumeWei: string;
}

interface LeaderboardEntryResponse {
  address: Address;
  lastActive: string;
  rank: number;
  resolvedPredictions: number;
  totalVolumeWei: string;
  totalWins: number;
  winRate: number;
}

interface LeaderboardResponse {
  contractAddress: Address | null;
  contractConfigured: boolean;
  entries: LeaderboardEntryResponse[];
  error?: string;
  latestBlock?: string;
  timeframe: ProtocolTimeframe;
  updatedAt: string;
}

const STATUS_LABELS: Record<AsyncStatus, string> = {
  IDLE: "Ready",
  SUBMITTING: "Confirm in wallet",
  PENDING_COMMITMENT: "Submitted",
  COMMITTED: "Committed",
  EXECUTOR_PROCESSING: "Agent processing",
  RESULT_READY: "Result ready",
  PENDING_SETTLEMENT: "Settling",
  SETTLED: "Recorded",
  FAILED: "Failed",
  EXPIRED: "Expired",
};

function localKey(address?: string) {
  return `siggy-positions:${address?.toLowerCase() ?? "disconnected"}`;
}

const ADMIN_MARKETS_KEY = "siggy-admin-market-overrides";

function updatedLabel(timestamp: number | null) {
  if (!timestamp) return "waiting for provider";
  return `updated ${new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

async function requestLiveMarkets(query = "", signal?: AbortSignal) {
  const localResponse = await fetch(
    query ? `/api/markets?q=${encodeURIComponent(query)}` : "/api/markets",
    { cache: "no-store", signal }
  );
  const localData = (await localResponse.json()) as {
    markets?: PredictionMarket[];
    live?: boolean;
    updatedAt?: string;
    error?: string;
    dataMode?: "LIVE" | "MIXED" | "MOCK";
  };
  if (localResponse.ok && localData.live && localData.markets?.length) {
    return {
      markets: localData.markets,
      updatedAt: localData.updatedAt
        ? new Date(localData.updatedAt).getTime()
        : Date.now(),
      dataMode: localData.dataMode ?? "MIXED",
    };
  }
  throw new Error(localData.error || "SIGGY generator returned no markets");
}

async function requestLiveHistory(marketId: string, probability: number) {
  const localResponse = await fetch(
    `/api/market-history?marketId=${encodeURIComponent(
      marketId
    )}&probability=${encodeURIComponent(probability)}`,
    { cache: "no-store" }
  );
  const localData = (await localResponse.json()) as {
    history?: PricePoint[];
  };
  if (!localResponse.ok) throw new Error("Confidence history unavailable");
  return localData.history ?? [];
}

async function requestLiveSignals(question: string) {
  const localResponse = await fetch(
    `/api/intel?q=${encodeURIComponent(question)}`,
    { cache: "no-store" }
  );
  const localData = (await localResponse.json()) as {
    signals?: NewsSignal[];
    live?: boolean;
    updatedAt?: string;
  };
  if (localResponse.ok && localData.live) {
    return {
      signals: localData.signals ?? [],
      updatedAt: localData.updatedAt
        ? new Date(localData.updatedAt).getTime()
        : Date.now(),
    };
  }
  throw new Error("Live news signals are unavailable");
}

export function SiggyDashboard() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [feedStatus, setFeedStatus] = useState<LiveStatus>("loading");
  const [streamStatus, setStreamStatus] =
    useState<StreamStatus>("connecting");
  const [marketDataMode, setMarketDataMode] = useState<
    "LIVE" | "MIXED" | "MOCK"
  >("MIXED");
  const [, setFeedUpdatedAt] = useState<number | null>(null);
  const [feedError, setFeedError] = useState("");
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [historyStatus, setHistoryStatus] =
    useState<LiveStatus>("loading");
  const [signals, setSignals] = useState<NewsSignal[]>([]);
  const [signalsStatus, setSignalsStatus] =
    useState<LiveStatus>("loading");
  const [signalsUpdatedAt, setSignalsUpdatedAt] = useState<number | null>(null);
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [activeView, setActiveView] = useState<
    "markets" | "leaderboard" | "signals" | "history" | "alerts" | "studio"
  >("markets");
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("0.10");
  const [query, setQuery] = useState("");
  const [remoteSearchMarkets, setRemoteSearchMarkets] = useState<
    PredictionMarket[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [txStatus, setTxStatus] = useState<AsyncStatus>("IDLE");
  const [message, setMessage] = useState("");
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);
  const [protocolTimeframe, setProtocolTimeframe] =
    useState<ProtocolTimeframe>("24h");
  const [protocolStatsStatus, setProtocolStatsStatus] =
    useState<ProtocolStatsStatus>("loading");
  const [protocolStats, setProtocolStats] =
    useState<ProtocolStatsResponse | null>(null);
  const [protocolRefreshVersion, setProtocolRefreshVersion] = useState(0);
  const [leaderboardTimeframe, setLeaderboardTimeframe] =
    useState<ProtocolTimeframe>("24h");
  const [leaderboardStatus, setLeaderboardStatus] =
    useState<LeaderboardStatus>("loading");
  const [leaderboard, setLeaderboard] =
    useState<LeaderboardResponse | null>(null);
  const [leaderboardRefreshVersion, setLeaderboardRefreshVersion] = useState(0);
  const [sharePosition, setSharePosition] = useState<PositionRecord | null>(
    null
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { address, chainId, isConnected } = useAccount();
  const { data: nativeBalance } = useBalance({
    address,
    query: { enabled: Boolean(address), refetchInterval: 5_000 },
  });
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const publicClient = usePublicClient();

  const selected =
    markets.find((market) => market.id === selectedId) ?? markets[0] ?? null;
  const siggyContractAddress =
    protocolStats?.contractConfigured && protocolStats.contractAddress
      ? protocolStats.contractAddress
      : null;
  const contractConfigured = Boolean(siggyContractAddress);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("siggy-theme");
    const nextTheme =
      savedTheme === "dark" ||
      (!savedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light";
    document.documentElement.dataset.theme = nextTheme;
    // Restoring a persisted display preference is an external-store sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(nextTheme);

    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProtocolStats() {
      try {
        const response = await fetch(
          `/api/protocol-stats?timeframe=${protocolTimeframe}`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as ProtocolStatsResponse;
        if (!active) return;
        setProtocolStats(data);
        if (!data.contractConfigured) {
          setProtocolStatsStatus("unconfigured");
        } else {
          setProtocolStatsStatus(response.ok ? "live" : "delayed");
        }
      } catch {
        if (active) setProtocolStatsStatus("delayed");
      }
    }

    loadProtocolStats();
    const timer = window.setInterval(loadProtocolStats, 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [protocolRefreshVersion, protocolTimeframe]);

  useEffect(() => {
    let active = true;

    async function loadLeaderboard() {
      try {
        const response = await fetch(
          `/api/leaderboard?timeframe=${leaderboardTimeframe}`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as LeaderboardResponse;
        if (!active) return;
        setLeaderboard(data);
        if (!data.contractConfigured) {
          setLeaderboardStatus("unconfigured");
        } else {
          setLeaderboardStatus(response.ok ? "live" : "delayed");
        }
      } catch {
        if (active) setLeaderboardStatus("delayed");
      }
    }

    loadLeaderboard();
    const timer = window.setInterval(loadLeaderboard, 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [leaderboardRefreshVersion, leaderboardTimeframe]);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const data = await requestLiveMarkets(needle, controller.signal);
        setRemoteSearchMarkets(data.markets);
      } catch {
        if (!controller.signal.aborted) setRemoteSearchMarkets([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await requestLiveMarkets();
        if (!active) return;
        let nextMarkets = data.markets;
        try {
          const saved = JSON.parse(
            window.localStorage.getItem(ADMIN_MARKETS_KEY) || "[]"
          ) as PredictionMarket[];
          const overrides = new Map(saved.map((market) => [market.id, market]));
          const manual = saved.filter((market) => !market.generated);
          nextMarkets = [
            ...data.markets.map((market) => overrides.get(market.id) ?? market),
            ...manual.filter(
              (market) => !data.markets.some((item) => item.id === market.id)
            ),
          ];
        } catch {
          // Invalid local dev overrides should never block the live generator.
        }
        setMarkets(nextMarkets);
        setSelectedId((current) =>
          nextMarkets.some((market) => market.id === current)
            ? current
            : nextMarkets[0].id
        );
        setFeedStatus("live");
        setStreamStatus("live");
        setMarketDataMode(data.dataMode);
        setFeedUpdatedAt(data.updatedAt);
        setFeedError("");
      } catch (error) {
        if (!active) return;
        setFeedStatus("delayed");
        setStreamStatus("offline");
        setFeedError(
          error instanceof Error ? error.message : "Market feed unavailable"
        );
      }
    }
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let nextPositions: PositionRecord[];
    try {
      const saved = window.localStorage.getItem(localKey(address));
      if (saved) {
        nextPositions = (JSON.parse(saved) as PositionRecord[]).filter(
          (position) =>
            position.id !== "sample-win" &&
            !position.txHash?.startsWith("preview")
        );
        window.localStorage.setItem(
          localKey(address),
          JSON.stringify(nextPositions)
        );
      } else {
        nextPositions = [];
      }
    } catch {
      nextPositions = [];
    }
    // Restoring wallet-scoped persisted activity is an external-store sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPositions(nextPositions);
  }, [address]);

  useEffect(() => {
    if (!siggyContractAddress || !publicClient) return;
    const contractAddress = siggyContractAddress;
    const openPositions = positions.filter(
      (position) => position.status === "OPEN" && position.marketKey
    );
    if (!openPositions.length) return;

    let active = true;
    async function syncSettlement() {
      const settlements = await Promise.all(
        openPositions.map(async (position) => {
          try {
            const market = await publicClient!.readContract({
              address: contractAddress,
              abi: siggyAbi,
              functionName: "markets",
              args: [position.marketKey!],
            });
            return {
              id: position.id,
              resolved: market[4],
              outcome: market[5],
            };
          } catch {
            return { id: position.id, resolved: false, outcome: false };
          }
        })
      );
      if (!active || !settlements.some((item) => item.resolved)) return;
      setLeaderboardRefreshVersion((version) => version + 1);

      setPositions((current) => {
        let changed = false;
        const next = current.map((position) => {
          const settlement = settlements.find((item) => item.id === position.id);
          if (!settlement?.resolved || position.status !== "OPEN") return position;
          changed = true;
          const won =
            (position.side === "YES" && settlement.outcome) ||
            (position.side === "NO" && !settlement.outcome);
          return {
            ...position,
            status: won ? ("WON" as const) : ("LOST" as const),
            resolvedAt: Date.now(),
          };
        });
        if (changed) {
          window.localStorage.setItem(localKey(address), JSON.stringify(next));
        }
        return changed ? next : current;
      });
    }

    syncSettlement();
    const timer = window.setInterval(syncSettlement, 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [address, positions, publicClient, siggyContractAddress]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    async function loadHistory() {
      try {
        const historyData = await requestLiveHistory(
          selected.id,
          selected.probability
        );
        if (active) {
          setHistory(historyData);
          setHistoryStatus("live");
        }
      } catch {
        if (active) setHistoryStatus("delayed");
      }
    }
    async function loadSignals() {
      try {
        const data = await requestLiveSignals(selected.question);
        if (active) {
          setSignals(data.signals);
          setSignalsStatus("live");
          setSignalsUpdatedAt(data.updatedAt);
        }
      } catch {
        if (active) setSignalsStatus("delayed");
      }
    }
    loadHistory();
    loadSignals();
    const historyTimer = window.setInterval(loadHistory, 15_000);
    const signalsTimer = window.setInterval(loadSignals, 60_000);
    return () => {
      active = false;
      window.clearInterval(historyTimer);
      window.clearInterval(signalsTimer);
    };
    // Primitive market identity fields prevent price-stream ticks from
    // restarting both provider polling loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.probability, selected?.question]);

  const filteredMarkets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const searchMarkets = needle.length >= 2 ? remoteSearchMarkets : [];
    const merged = Array.from(
      new Map(
        [...markets, ...searchMarkets].map((market) => [market.id, market])
      ).values()
    );
    return merged.filter((market) => {
      const isPublished =
        market.publicationStatus !== "REJECTED" &&
        market.publicationStatus !== "RESOLVED" &&
        market.publicationStatus !== "DRAFT";
      const categoryMatches =
        categoryFilter === "All" || market.category === categoryFilter;
      const queryMatches =
        !needle ||
        `${market.question} ${market.category} ${market.description} ${market.slug}`
          .toLowerCase()
          .includes(needle);
      return isPublished && categoryMatches && queryMatches;
    });
  }, [categoryFilter, markets, query, remoteSearchMarkets]);

  const categories = useMemo(
    () => [
      "All",
      "Crypto",
      "TGE / Mainnet",
      ...Array.from(new Set(markets.map((market) => market.category))).filter(
        (category) =>
          category !== "Crypto" && category !== "TGE / Mainnet"
      ),
    ],
    [markets]
  );

  const marketAlerts = useMemo(
    () =>
      [...markets]
        .filter((market) => Math.abs(market.change24h) >= 1)
        .sort(
          (left, right) =>
            Math.abs(right.change24h) - Math.abs(left.change24h)
        )
        .slice(0, 8),
    [markets]
  );
  const alertCount = Math.min(99, signals.length + marketAlerts.length);
  const priceFeedLabel =
    streamStatus === "live"
      ? "SIGGY generator live"
      : feedStatus === "live"
        ? "Generated market feed"
        : feedStatus === "loading"
          ? "Connecting live feeds"
          : "Generator delayed";
  const priceFeedLive = streamStatus === "live" || feedStatus === "live";

  function selectMarket(market: PredictionMarket) {
    if (!markets.some((item) => item.id === market.id)) {
      setMarkets((current) => [market, ...current]);
    }
    setSelectedId(market.id);
    setActiveView("markets");
    setQuery("");
    setRemoteSearchMarkets([]);
    setSearching(false);
    document.querySelector("#main-content")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function updateAdminMarkets(nextMarkets: PredictionMarket[]) {
    setMarkets(nextMarkets);
    window.localStorage.setItem(
      ADMIN_MARKETS_KEY,
      JSON.stringify(nextMarkets)
    );
  }

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("siggy-theme", nextTheme);
  }

  async function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        audio.muted = false;
        audio.volume = 0.35;
        await audio.play();
        setMusicPlaying(true);
        setMessage("");
      } catch {
        setMessage("Your browser blocked audio. Tap the music button again.");
      }
    } else {
      audio.pause();
      setMusicPlaying(false);
    }
  }

  async function placePrediction() {
    if (!selected) return;
    if (!isConnected) {
      setMessage("Connect your wallet to place a testnet position.");
      return;
    }
    if (!contractConfigured) {
      setMessage("The SIGGY Ritual contract is not configured.");
      return;
    }
    const contractAddress = siggyContractAddress;
    if (!contractAddress) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setMessage("Enter a valid RITUAL amount.");
      return;
    }
    if (chainId !== ritualChain.id) {
      try {
        setMessage("Switch to Ritual Testnet in MetaMask to continue.");
        await switchChainAsync({ chainId: ritualChain.id });
      } catch {
        setMessage("Please switch to Ritual Testnet before placing a position.");
        return;
      }
    }

    setMessage("");
    setTxStatus("SUBMITTING");
    let txHash: `0x${string}` | null = null;
    let now = Math.floor(Date.now() / 1000);
    let closeTime = marketCloseTime(selected.endDate, now);
    let marketKey = marketRoundKeys(selected.id, closeTime, now)[0];
    try {
      if (!publicClient || !address) {
        throw new Error("Ritual network client is not ready");
      }
      const latestBlock = await publicClient.getBlock({
        blockTag: "latest",
      });
      now = Number(latestBlock.timestamp);
      closeTime = marketCloseTime(selected.endDate, now);
      const candidateKeys = marketRoundKeys(selected.id, closeTime, now);
      let foundOpenRound = false;

      for (const candidateKey of candidateKeys) {
        const candidateMarket = await publicClient.readContract({
          address: contractAddress,
          abi: siggyAbi,
          functionName: "markets",
          args: [candidateKey],
        });
        const candidateIsOpen =
          !candidateMarket[6] ||
          (!candidateMarket[4] &&
            candidateMarket[1] > BigInt(now));
        if (candidateIsOpen) {
          marketKey = candidateKey;
          foundOpenRound = true;
          break;
        }
      }
      if (!foundOpenRound) {
        throw new Error("MarketClosed");
      }
      const args = [
        marketKey,
        selected.question,
        BigInt(closeTime),
        side === "YES",
      ] as const;
      const stake = parseEther(amount);
      const gasEstimate = await publicClient.estimateContractGas({
        account: address,
        address: contractAddress,
        abi: siggyAbi,
        functionName: "enterMarket",
        args,
        value: stake,
      });
      const data = encodeFunctionData({
        abi: siggyAbi,
        functionName: "enterMarket",
        args,
      });
      txHash = await sendTransactionAsync({
        to: contractAddress,
        data,
        value: stake,
        gas: bufferedGas(gasEstimate),
      });
      setLastTxHash(txHash);
      setTxStatus("PENDING_COMMITMENT");
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      if (receipt.status !== "success") {
        throw new Error("Transaction reverted on Ritual");
      }

      const record: PositionRecord = {
        id: `${selected.id}-${Date.now()}`,
        marketId: selected.id,
        marketKey,
        question: selected.question,
        side,
        amount: value,
        probability: side === "YES" ? selected.probability : 100 - selected.probability,
        createdAt: Date.now(),
        closeTime,
        status: "OPEN",
        txHash,
      };
      const next = [record, ...positions];
      setPositions(next);
      window.localStorage.setItem(localKey(address), JSON.stringify(next));
      setTxStatus("SETTLED");
      setProtocolRefreshVersion((version) => version + 1);
      setLeaderboardRefreshVersion((version) => version + 1);
      setMessage(
        "Position recorded on Ritual Testnet. It stays OPEN until the market resolves on-chain."
      );
    } catch (error) {
      setTxStatus("FAILED");
      setMessage(friendlyTradeError(error));
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to market dashboard
      </a>
      <audio
        ref={audioRef}
        src="/audio/siggy-arcade.mp3"
        loop
        preload="metadata"
        onPlay={() => setMusicPlaying(true)}
        onPause={() => setMusicPlaying(false)}
      />
      <aside className="sidebar">
        <div className="brand-block">
          <div className="siggy-logo-shell">
            <Image
              src="/siggy-logo.webp"
              alt="SIGGY woven knot logo"
              width={44}
              height={44}
              priority
            />
          </div>
          <div>
            <strong>SIGGY</strong>
            <small>PREDICTION MARKET</small>
          </div>
        </div>

        <div className="search-region">
          <div className="search-shell">
            <Search size={16} />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                if (nextQuery.trim().length < 2) {
                  setRemoteSearchMarkets([]);
                  setSearching(false);
                }
              }}
              placeholder="Search markets or projects"
              aria-label="Search markets"
            />
            <kbd>Ctrl K</kbd>
          </div>
          {query.trim() ? (
            <div className="search-results" role="listbox" aria-label="Market search results">
              <span>{searching ? "Searching live markets…" : `${filteredMarkets.length} matches`}</span>
              {filteredMarkets.slice(0, 6).map((market) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={market.id === selectedId}
                  onClick={() => selectMarket(market)}
                  key={market.id}
                >
                  <small>{market.category}</small>
                  <strong>{market.question}</strong>
                </button>
              ))}
              {!searching && !filteredMarkets.length ? (
                <p>No active market matches that search.</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <nav className="side-nav" aria-label="Primary navigation">
          <span className="nav-label">Discover</span>
          <button
            type="button"
            className={activeView === "markets" ? "active" : ""}
            onClick={() => setActiveView("markets")}
          >
            <LayoutDashboard size={17} /> Markets
          </button>
          <button
            type="button"
            className={activeView === "leaderboard" ? "active" : ""}
            onClick={() => setActiveView("leaderboard")}
          >
            <Trophy size={17} /> Leaderboard
            <em>{leaderboard?.entries.length ?? 0}</em>
          </button>
          <button
            type="button"
            className={activeView === "signals" ? "active" : ""}
            onClick={() => setActiveView("signals")}
          >
            <Bot size={17} /> Agent signals
            <em>{signals.length}</em>
          </button>
          <span className="nav-label">Wallet</span>
          <button
            type="button"
            className={activeView === "history" ? "active" : ""}
            onClick={() => setActiveView("history")}
          >
            <History size={17} /> History & txns
          </button>
          <button
            type="button"
            className={activeView === "alerts" ? "active" : ""}
            onClick={() => setActiveView("alerts")}
          >
            <Bell size={17} /> Alerts
            <em>{alertCount}</em>
          </button>
          <span className="nav-label">Build</span>
          <button
            type="button"
            className={activeView === "studio" ? "active" : ""}
            onClick={() => setActiveView("studio")}
          >
            <Sparkles size={17} /> Market studio
          </button>
        </nav>

        <div className="agent-card">
          <div className="agent-orbit">
            <Sparkles size={20} />
          </div>
          <span className="eyebrow">Sovereign intelligence</span>
          <strong>News enters. Signals emerge.</strong>
          <p>
            SIGGY converts live crypto, AI, Ritual, on-chain, GitHub, and news
            signals into objective daily markets.
          </p>
          <div className="verified-row">
            <span className="status-dot" /> Ritual agent ready
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div>
            <span className="eyebrow">Live on Ritual Testnet · Chain 1979</span>
            <h1>
              Read the signal. <i>Price the future.</i>
            </h1>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="control-button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === "light" ? "Dark" : "Light"}</span>
            </button>
            <button
              type="button"
              className={`control-button ${musicPlaying ? "playing" : ""}`}
              onClick={toggleMusic}
              aria-label={musicPlaying ? "Turn music off" : "Turn music on"}
              aria-pressed={musicPlaying}
              title={musicPlaying ? "Turn music off" : "Turn music on"}
            >
              {musicPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{musicPlaying ? "Music on" : "Music off"}</span>
            </button>
            <div className={`live-pill ${priceFeedLive ? "" : "delayed"}`}>
              <Radio size={14} />
              {priceFeedLabel}
            </div>
            <WalletButton />
          </div>
        </header>

        <main id="main-content" className="dashboard">
          <section className="metric-strip" aria-label="Market overview">
            <div>
              <span>Active markets</span>
              <strong>
                {protocolStatsStatus === "loading"
                  ? "—"
                  : protocolStats?.activeMarkets ?? "—"}
              </strong>
              <small>
                <Activity size={13} />{" "}
                {protocolStatsStatus === "unconfigured"
                  ? "SIGGY contract not configured"
                  : updatedLabel(
                      protocolStats?.updatedAt
                        ? new Date(protocolStats.updatedAt).getTime()
                        : null
                    )}
              </small>
            </div>
            <div>
              <div className="metric-label-row">
                <span>{PROTOCOL_TIMEFRAME_LABELS[protocolTimeframe]}</span>
                <select
                  aria-label="Protocol volume timeframe"
                  value={protocolTimeframe}
                  onChange={(event) =>
                    setProtocolTimeframe(
                      event.target.value as ProtocolTimeframe
                    )
                  }
                >
                  {PROTOCOL_TIMEFRAMES.map((timeframe) => (
                    <option value={timeframe} key={timeframe}>
                      {timeframe === "all" ? "ALL" : timeframe.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <strong>
                {protocolStatsStatus !== "live" ||
                !protocolStats?.contractConfigured
                  ? "—"
                  : formatProtocolVolume(BigInt(protocolStats.volumeWei))}
              </strong>
              <small
                className={protocolStatsStatus === "live" ? "positive" : ""}
              >
                <TrendingUp size={13} />{" "}
                {protocolStatsStatus === "live"
                  ? "SIGGY protocol activity"
                  : protocolStatsStatus === "unconfigured"
                    ? "waiting for SIGGY contract"
                    : "protocol index syncing"}
              </small>
            </div>
            <div>
              <span>Connected balance</span>
              <strong>
                {nativeBalance
                  ? Number(formatEther(nativeBalance.value)).toFixed(4)
                  : "—"}
                <sup> RITUAL</sup>
              </strong>
              <small>
                {isConnected ? "live on-chain · refreshes every 5s" : "wallet not connected"}
              </small>
            </div>
            <div className="metric-accent">
              <span>Agent coverage</span>
              <strong>
                {signalsStatus === "live"
                  ? "LIVE"
                  : signalsStatus === "loading"
                    ? "SYNCING"
                    : "DELAYED"}
              </strong>
              <small>
                <Sparkles size={13} /> {updatedLabel(signalsUpdatedAt)}
              </small>
            </div>
          </section>

          {activeView === "markets" || activeView === "signals" ? (
            <MarketDashboard
              markets={markets}
              selectedId={selected?.id}
              onSelect={selectMarket}
              dataMode={marketDataMode}
            />
          ) : null}

          {activeView === "studio" ? (
            <AdminMarketPanel
              markets={markets}
              onMarketsChange={updateAdminMarkets}
              onSelect={selectMarket}
            />
          ) : activeView === "leaderboard" ? (
            <section className="leaderboard-view">
              <div className="section-head leaderboard-head">
                <div>
                  <span className="eyebrow">Confirmed on Ritual Chain</span>
                  <h2>Prediction market leaderboard</h2>
                  <p>
                    Ranked only from final SIGGY resolutions and confirmed
                    protocol volume.
                  </p>
                </div>
                <div className="leaderboard-controls">
                  <div
                    className="leaderboard-timeframes"
                    aria-label="Leaderboard timeframe"
                  >
                    {PROTOCOL_TIMEFRAMES.map((timeframe) => (
                      <button
                        type="button"
                        className={
                          leaderboardTimeframe === timeframe ? "active" : ""
                        }
                        onClick={() => setLeaderboardTimeframe(timeframe)}
                        key={timeframe}
                      >
                        {timeframe === "all"
                          ? "All Time"
                          : timeframe.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <span
                    className={`leaderboard-live ${leaderboardStatus}`}
                    role="status"
                  >
                    <Radio size={12} />
                    {leaderboardStatus === "live"
                      ? "Live contract events"
                      : leaderboardStatus === "loading"
                        ? "Syncing contract events"
                        : leaderboardStatus === "unconfigured"
                          ? "Contract not configured"
                          : "Indexer reconnecting"}
                  </span>
                </div>
              </div>

              <div className="leaderboard-table" role="table">
                <div className="leaderboard-row leaderboard-columns" role="row">
                  <span role="columnheader">Rank</span>
                  <span role="columnheader">Wallet address</span>
                  <span role="columnheader">Total volume</span>
                  <span role="columnheader">Wins</span>
                  <span role="columnheader">Win rate</span>
                  <span role="columnheader">Last active</span>
                </div>
                {leaderboardStatus === "loading" ? (
                  <div className="leaderboard-empty">
                    <Activity size={22} />
                    <strong>Reading SIGGY contract events</strong>
                    <span>Confirmed winners will appear after indexing.</span>
                  </div>
                ) : leaderboardStatus === "live" &&
                  !leaderboard?.entries.length ? (
                  <div className="leaderboard-empty">
                    <Trophy size={22} />
                    <strong>No confirmed winners yet.</strong>
                    <span>
                      Open and unresolved predictions are never ranked.
                    </span>
                  </div>
                ) : leaderboardStatus === "unconfigured" ? (
                  <div className="leaderboard-empty">
                    <Trophy size={22} />
                    <strong>SIGGY contract not configured</strong>
                    <span>
                      The leaderboard will remain empty until a valid contract
                      is configured.
                    </span>
                  </div>
                ) : leaderboardStatus === "delayed" ? (
                  <div className="leaderboard-empty">
                    <Radio size={22} />
                    <strong>Leaderboard index is reconnecting</strong>
                    <span>No cached or placeholder users are being shown.</span>
                  </div>
                ) : (
                  leaderboard?.entries.map((entry) => (
                    <div className="leaderboard-row" role="row" key={entry.address}>
                      <span
                        className={`leaderboard-rank rank-${entry.rank}`}
                        role="cell"
                      >
                        {String(entry.rank).padStart(2, "0")}
                      </span>
                      <span className="leaderboard-wallet" role="cell">
                        <i />
                        <strong title={entry.address}>
                          {entry.address.slice(0, 8)}…
                          {entry.address.slice(-6)}
                        </strong>
                      </span>
                      <strong role="cell">
                        {formatProtocolVolume(BigInt(entry.totalVolumeWei))}
                      </strong>
                      <strong role="cell">{entry.totalWins}</strong>
                      <span role="cell">{entry.winRate.toFixed(1)}%</span>
                      <span role="cell">
                        {new Date(entry.lastActive).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="leaderboard-foot">
                <span>
                  Source: SIGGY contract events only · Chain 1979
                </span>
                <span>
                  {updatedLabel(
                    leaderboard?.updatedAt
                      ? new Date(leaderboard.updatedAt).getTime()
                      : null
                  )}
                </span>
              </div>
            </section>
          ) : activeView === "history" ? (
            <section className="history-view">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Your activity</span>
                  <h2>History & transactions</h2>
                </div>
                <span>{positions.length} records</span>
              </div>
              <div className="history-table" role="table">
                {!positions.length ? (
                  <div className="history-empty">
                    <History size={22} />
                    <strong>No predictions yet</strong>
                    <span>Your real on-chain positions will appear here.</span>
                  </div>
                ) : null}
                {positions.map((position) => (
                  <article className="history-row" key={position.id}>
                    <span className={`position-side ${position.side.toLowerCase()}`}>
                      {position.side}
                    </span>
                    <div>
                      <strong>{position.question}</strong>
                      <small>{new Date(position.createdAt).toLocaleString()}</small>
                    </div>
                    <span>{position.amount.toFixed(2)} RITUAL</span>
                    <span>
                      {(position.probability / 100).toFixed(2)} RITUAL entry
                    </span>
                    <b
                      className={position.status.toLowerCase()}
                      title={
                        position.status === "OPEN"
                          ? "Polling Ritual Chain for final resolution"
                          : undefined
                      }
                    >
                      {position.status === "OPEN" ? "OPEN · LIVE" : position.status}
                    </b>
                    {position.status === "WON" ? (
                      <button
                        type="button"
                        className="share-row-button"
                        onClick={() => setSharePosition(position)}
                      >
                        <Share2 size={15} /> Share win
                      </button>
                    ) : (
                      <small className="mono">
                        {position.txHash?.startsWith("0x")
                          ? `${position.txHash.slice(0, 8)}…`
                          : "unavailable"}
                      </small>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ) : activeView === "alerts" ? (
            <section className="alerts-view">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Transparent signal feed</span>
                  <h2>Alerts and their sources</h2>
                </div>
                <span className="alert-count">
                  <Bell size={14} /> {alertCount} active
                </span>
              </div>

              <div className="alert-source-grid" aria-label="Alert data sources">
                <article>
                  <Radio size={17} />
                  <div>
                    <strong>SIGGY Market Generator</strong>
                    <span>
                      Daily markets, confidence, odds, and quality-gate results
                      from SIGGY&apos;s own source adapters.
                    </span>
                  </div>
                  <b>AI MARKETS</b>
                </article>
                <article>
                  <Bot size={17} />
                  <div>
                    <strong>GDELT News</strong>
                    <span>
                      Fresh reporting matched to the selected market by SIGGY.
                    </span>
                  </div>
                  <b>NEWS SIGNAL</b>
                </article>
                <article>
                  <Activity size={17} />
                  <div>
                    <strong>Ritual Chain</strong>
                    <span>
                      Wallet positions and final resolution state from chain 1979.
                    </span>
                  </div>
                  <b>ON-CHAIN</b>
                </article>
              </div>

              <div className="alert-feed">
                <div className="alert-feed-head">
                  <div>
                    <span className="eyebrow">News intelligence</span>
                    <h3>Reporting behind this market</h3>
                  </div>
                  <span>{selected?.question ?? "Select a live market"}</span>
                </div>
                {signals.length ? (
                  signals.slice(0, 6).map((signal) => (
                    <a
                      className="alert-item news-alert"
                      href={signal.url}
                      target="_blank"
                      rel="noreferrer"
                      key={signal.url}
                    >
                      <span className="alert-icon">
                        <Bot size={16} />
                      </span>
                      <div>
                        <small>
                          GDELT · {signal.domain} · {signal.relevance}% match
                        </small>
                        <strong>{signal.title}</strong>
                      </div>
                      <ExternalLink size={15} />
                    </a>
                  ))
                ) : (
                  <div className="alert-empty">
                    <Sparkles size={19} />
                    <div>
                      <strong>SIGGY is scanning GDELT reporting</strong>
                      <span>
                        Matching headlines appear here when the live news feed
                        finds a relevant source.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="alert-feed">
                <div className="alert-feed-head">
                  <div>
                    <span className="eyebrow">Market movement</span>
                    <h3>Probability alerts</h3>
                  </div>
                  <span>Source: SIGGY live adapters</span>
                </div>
                {marketAlerts.map((market) => (
                  <button
                    type="button"
                    className="alert-item market-alert"
                    onClick={() => selectMarket(market)}
                    key={market.id}
                  >
                    <span
                      className={`alert-icon ${
                        market.change24h >= 0 ? "up" : "down"
                      }`}
                    >
                      {market.change24h >= 0 ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <ArrowDownRight size={16} />
                      )}
                    </span>
                    <div>
                      <small>
                        {market.category} · {market.change24h >= 0 ? "+" : ""}
                        {market.change24h.toFixed(1)}% in 24h
                      </small>
                      <strong>{market.question}</strong>
                    </div>
                    <b>{market.probability.toFixed(0)}%</b>
                  </button>
                ))}
              </div>

              <p className="alert-method">
                Alerts are informational signals, not financial advice. SIGGY
                displays the provider on every alert so users can inspect the
                original source before predicting.
              </p>
            </section>
          ) : !selected ? (
            <section className="live-data-state" role="status">
              <Radio size={28} />
              <span className="eyebrow">Live provider status</span>
              <h2>
                {feedStatus === "loading"
                  ? "Generating today’s prediction markets"
                  : "The SIGGY generator is delayed"}
              </h2>
              <p>
                {feedStatus === "loading"
                  ? "SIGGY is collecting crypto, AI, Ritual, on-chain, GitHub, and news signals."
                  : `${
                      feedError || "One or more live adapters are not responding."
                    } Mock fallback is labeled whenever it is used.`}
              </p>
              <small>Automatic retry runs every 60 seconds.</small>
            </section>
          ) : (
            <>
              <section className="focus-grid">
                <div className="chart-panel">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">{selected.category} market</span>
                      <h2>{selected.question}</h2>
                    </div>
                    <a
                      href={selected.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="source-link"
                    >
                      Source <ExternalLink size={14} />
                    </a>
                  </div>
                  <div className="chart-toolbar">
                    <div className="probability">
                      <span>Yes probability</span>
                      <strong>{selected.probability.toFixed(0)}%</strong>
                      <em className={selected.change24h >= 0 ? "positive" : "negative"}>
                        {selected.change24h >= 0 ? (
                          <ArrowUpRight size={15} />
                        ) : (
                          <ArrowDownRight size={15} />
                        )}
                        {Math.abs(selected.change24h).toFixed(1)}% today
                      </em>
                    </div>
                    <div className="range-tabs">
                      <button type="button">1D</button>
                      <button type="button" className="active">1W</button>
                      <button type="button">1M</button>
                      <button type="button">ALL</button>
                    </div>
                  </div>
                  <MarketChart
                    data={history}
                    status={historyStatus}
                    theme={theme}
                  />
                  <div className="chart-legend">
                    <span><i className="yes-dot" /> Yes probability</span>
                    <span><i className="signal-dot" /> SIGGY confidence path</span>
                    <span>AI confidence {selected.confidenceScore ?? 0}%</span>
                    <span>{selected.riskLevel ?? "MEDIUM"} risk</span>
                  </div>
                </div>

                <aside className="trade-panel">
                  <div>
                    <span className="eyebrow">Take a position</span>
                    <h2>What’s your signal?</h2>
                  </div>
                  <div className="side-selector">
                    <button
                      type="button"
                      className={side === "YES" ? "active yes" : ""}
                      onClick={() => setSide("YES")}
                    >
                      <span>YES</span>
                      <strong>
                        {(selected.probability / 100).toFixed(2)} RITUAL
                      </strong>
                    </button>
                    <button
                      type="button"
                      className={side === "NO" ? "active no" : ""}
                      onClick={() => setSide("NO")}
                    >
                      <span>NO</span>
                      <strong>
                        {((100 - selected.probability) / 100).toFixed(2)}{" "}
                        RITUAL
                      </strong>
                    </button>
                  </div>
                  <label className="amount-field">
                    <span>Amount</span>
                    <div>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                      />
                      <b>RITUAL</b>
                    </div>
                  </label>
                  <div className="quick-amounts">
                    {["0.05", "0.10", "0.25", "1.00"].map((value) => (
                      <button type="button" onClick={() => setAmount(value)} key={value}>
                        {value} RITUAL
                      </button>
                    ))}
                  </div>
                  <div className="estimate-box">
                    <span>Potential return</span>
                    <strong>
                      {(
                        Number(amount || 0) *
                        (100 /
                          (side === "YES"
                            ? selected.probability
                            : 100 - selected.probability))
                      ).toFixed(2)}{" "}
                      RITUAL
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="primary-button place-button"
                    onClick={placePrediction}
                    disabled={
                      protocolStatsStatus === "loading" ||
                      !contractConfigured ||
                      isSwitchingChain ||
                      txStatus === "SUBMITTING" ||
                      txStatus === "PENDING_COMMITMENT"
                    }
                    data-testid="place-prediction"
                  >
                    <CircleDollarSign size={17} />
                    {STATUS_LABELS[txStatus]}
                  </button>
                  <p className="trade-note">
                    {protocolStatsStatus === "unconfigured"
                      ? "Transactions are disabled until the SIGGY Ritual contract is configured."
                      : contractConfigured
                      ? "Transactions settle through the configured SIGGY contract."
                      : protocolStatsStatus === "loading"
                        ? "Verifying the configured SIGGY Ritual contract."
                        : "The SIGGY protocol configuration check is temporarily unavailable."}
                  </p>
                  {message ? (
                    <div className="inline-message" role="status">
                      {message}
                      {lastTxHash && txStatus === "FAILED" ? (
                        <>
                          {" "}
                          <a
                            href={`https://explorer.ritualfoundation.org/tx/${lastTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View transaction
                          </a>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </aside>
              </section>

              <section className="lower-grid">
                <div className="market-list-panel">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">Market radar</span>
                      <h2>{activeView === "signals" ? "Agent-ranked markets" : "Live prediction markets"}</h2>
                    </div>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setCategoryFilter("All");
                        setQuery("");
                      }}
                    >
                      View all <ChevronRight size={15} />
                    </button>
                  </div>
                  <div className="category-tabs" aria-label="Market categories">
                    {categories.slice(0, 7).map((category) => (
                      <button
                        type="button"
                        className={categoryFilter === category ? "active" : ""}
                        onClick={() => setCategoryFilter(category)}
                        key={category}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  <div className="market-list">
                    {filteredMarkets.slice(0, 12).map((market, index) => (
                      <button
                        type="button"
                        className={`market-row ${market.id === selected.id ? "selected" : ""}`}
                        onClick={() => selectMarket(market)}
                        key={market.id}
                      >
                        <span className="rank">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <span>{market.category}</span>
                          <strong>{market.question}</strong>
                        </div>
                        <span className="volume">
                          {market.confidenceScore ?? 0}% AI
                        </span>
                        <div className="mini-probability">
                          <i style={{ width: `${market.probability}%` }} />
                        </div>
                        <b>{market.probability.toFixed(0)}%</b>
                      </button>
                    ))}
                    {!filteredMarkets.length ? (
                      <div className="market-empty">
                        <Search size={20} />
                        <strong>No matching active markets</strong>
                        <span>Try another project, token, TGE, or mainnet keyword.</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <MarketDetails market={selected} />
              </section>
            </>
          )}
        </main>

        <footer className="product-footer">
          <div className="footer-mark">SIGGY</div>
          <p>
            Build on Ritual chain, Ritual Predict is a decentralized prediction
            market built on the Ritual Chain, where users can create and
            participate in markets based on real-world events. Powered by AI and
            smart contracts, it delivers transparent, trustless, and efficient
            market resolution while showcasing Ritual&apos;s sovereign agent
            capabilities.
          </p>
          <div>
            <span>Powered by</span>
            <strong>RITUAL</strong>
          </div>
        </footer>
      </div>

      {sharePosition ? (
        <ShareWin position={sharePosition} onClose={() => setSharePosition(null)} />
      ) : null}
    </div>
  );
}
