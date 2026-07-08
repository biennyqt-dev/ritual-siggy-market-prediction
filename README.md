# SIGGY Prediction Market

SIGGY is an AI-powered daily prediction market platform built for Ritual Chain. It turns current crypto, AI, Ritual ecosystem, on-chain, DeFi, GitHub, news, macro, and optional X signals into objective YES/NO markets with transparent resolution rules.

## What is included

- Green-and-white responsive financial dashboard
- User-selectable light and dark Ritual themes
- Toggleable arcade soundtrack with browser-safe user-controlled playback
- Daily and real-time SIGGY-generated market listings
- Search, Today, Trending, Crypto, AI, and Ritual discovery views
- Confidence-history charts, suggested YES/NO odds, source labels, and deadlines
- Quality gates for objectivity, deadline clarity, source trust, relevance, resolvability, and duplicate removal
- Live CoinGecko, DefiLlama, GitHub, GDELT, and Ritual RPC adapters
- Optional X recent-search adapter with a clearly labeled mock fallback for development
- AI reasoning panel with YES/NO cases, supporting data, and resolution criteria
- Browser-local market studio for approval, rejection, editing, regeneration, manual drafts, and resolution testing
- Daily Vercel cron route that refreshes and validates the market batch
- GDELT news signals matched to the selected market
- Injected-wallet connection and Ritual Testnet chain switching
- Native RITUAL balance polling every five seconds
- YES/NO position flow with explicit transaction lifecycle states
- On-chain market settlement polling; positions remain OPEN until resolution
- Position and transaction history
- Downloadable win image and X sharing link
- Solidity prediction-market contract with authenticated sovereign-agent callbacks
- Ritual RPC proxy and read-only chain verification script

## Run locally

Requirements: Node.js 22 or newer and an injected EVM wallet for wallet testing.

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

Copy `.env.example` to `.env.local` to override the defaults:

```dotenv
RITUAL_RPC_URL=https://rpc.ritualfoundation.org
NEXT_PUBLIC_RITUAL_RPC_URL=https://rpc.ritualfoundation.org
SIGGY_RITUAL_CONTRACT_ADDRESS=
SIGGY_RITUAL_CONTRACT_DEPLOYMENT_BLOCK=
NEXT_PUBLIC_APP_URL=http://localhost:3000
X_BEARER_TOKEN=
CRON_SECRET=
NEXT_PUBLIC_ENABLE_MARKET_ADMIN=true
```

The public dashboard works without a private key. CoinGecko, DefiLlama, GitHub, GDELT, and Ritual RPC use server-side adapters and require no browser credentials. `X_BEARER_TOKEN` is optional. If live adapters are unavailable, the API returns deterministic mock-adapter markets marked `MOCK DATA`.

## Ritual Testnet deployment

Never commit a private key or paste it into chat. Put a testnet-only deployer key in the local, gitignored `.env` file. `.env.local` is also supported as a fallback for local development:

```dotenv
PRIVATE_KEY=0x...
```

The deploy script also accepts the same key without the `0x` prefix and normalizes it before signing.

Then run:

```bash
npm run verify:chain
npm run deploy:ritual
```

On Windows, you can also run the helper below. It prompts for the testnet key for the current terminal session and does not commit or save it:

```powershell
.\DEPLOY_SIGGY_TO_RITUAL.cmd
```

The deployment script compiles `contracts/src/SiggyPredictionMarket.sol`, deploys it to Ritual Testnet (chain ID `1979`), waits for confirmation, and prints the contract address plus deployment block. Add both values to `.env.local` and to the Vercel project environment:

```dotenv
SIGGY_RITUAL_CONTRACT_ADDRESS=0x...
SIGGY_RITUAL_CONTRACT_DEPLOYMENT_BLOCK=123456
```

Restart or redeploy the app. Positions will then submit real wallet transactions through the configured contract. The dashboard’s active-market count and selectable 24-hour, 7-day, 30-day, and all-time RIT volume are aggregated only from this contract’s `MarketCreated`, `MarketResolved`, and `PredictionPlaced` events. Generator source signals never contribute to protocol statistics or leaderboard volume.

## Verification

```bash
npm test
npm run lint
npm run build
npm audit
```

The contract tests compile Solidity with `solc` and verify the canonical Ritual async callback selector and system address. Frontend tests ensure all required async transaction states remain represented.

## Architecture

- `app/` — Vercel-detectable Next.js dashboard, providers, and API routes
- `app/api/cron/generate-markets/` — daily Vercel market-generation cron
- `src/components/` — generated-market dashboard, reasoning, admin studio, wallet, charts, trading, and win-sharing UI
- `src/agent/` and `src/tool/` — autonomous market-agent building blocks
- `contracts/` — Solidity market contract, Foundry test, and deploy script
- `src/lib/data-sources/` — replaceable live and mock data adapters
- `src/lib/market-generator/` — daily generation, duplicate prevention, and quality checks
- `src/lib/resolution-rules/` — objective source-specific resolution templates
- `src/lib/ai-confidence/` — confidence, odds, movement, and risk scoring
- `src/lib/` — Ritual chain configuration and shared market types
- `public/` — logo, music, and static browser assets
- `index.html` — static repository entry page; Next.js runs from `app/`
- `scripts/` — local-key deployment and read-only chain checks
- `test/` — Solidity compile and frontend state tests

Market discovery is generated entirely by SIGGY from its own adapter pipeline. No external prediction-market feed is imported. Source signals inform market creation only; settlement, protocol statistics, leaderboard results, and position custody belong to the configured Ritual contract.

The admin studio is intentionally browser-local and does not receive a deployer key. Production approval shared across operators should be connected to an authenticated database or an on-chain governance workflow before enabling multiple administrators.

## Built with Ritual dApp Skills

This project is maintained using Ritual dApp Skills as the primary Codex workflow.
The local skill package is expected at:

```text
.codex/skills/ritual-dapp-skills
```

Before implementation or deployment work, Codex should read:

```text
.codex/skills/ritual-dapp-skills/skills/ritual/SKILL.md
```

For SIGGY, the Ritual workflow is used to guide chain configuration, contract deployment checks, async transaction-state handling, protocol-stat aggregation, frontend wallet behavior, and verification before pushing or deploying.

## Safety

- Use a fresh testnet wallet with only test funds.
- Keep `.env.local` out of version control.
- Do not deploy the contract to mainnet without an independent security review.
- AI/news signals are informational and do not guarantee outcomes.
