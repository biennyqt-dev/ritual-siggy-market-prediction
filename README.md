# SIGGY Prediction Market

SIGGY is an AI-assisted prediction market dashboard built for Ritual Chain. It pairs live public prediction-market data with news intelligence, wallet connectivity, Ritual-native contracts, transaction history, and shareable win cards.

## What is included

- Green-and-white responsive financial dashboard
- User-selectable light and dark Ritual themes
- Toggleable arcade soundtrack with browser-safe user-controlled playback
- Live market listings and probability history charts
- Search-backed Polymarket discovery plus Crypto and TGE/Mainnet filters
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
NEXT_PUBLIC_SIGGY_CONTRACT=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The public dashboard works without a private key. External market/news requests use server-side routes so browser clients do not need provider credentials.

## Ritual Testnet deployment

Never commit a private key or paste it into chat. Put a testnet-only deployer key in the local, gitignored `.env.local` file:

```dotenv
PRIVATE_KEY=0x...
```

Then run:

```bash
npm run verify:chain
npm run deploy:ritual
```

The deployment script compiles `contracts/src/SiggyPredictionMarket.sol`, deploys it to Ritual Testnet (chain ID `1979`), waits for confirmation, and prints the contract address. Add that address to `.env.local`:

```dotenv
NEXT_PUBLIC_SIGGY_CONTRACT=0x...
```

Restart the app. Positions will then submit real wallet transactions through the configured contract.

## Verification

```bash
npm test
npm run lint
npm run build
npm audit
```

The contract tests compile Solidity with `solc` and verify the canonical Ritual async callback selector and system address. Frontend tests ensure all required async transaction states remain represented.

## Architecture

- `src/app/` — Next.js dashboard, providers, and live-data API routes
- `src/components/` — wallet, chart, history, trading, and win-sharing UI
- `src/agent/` and `src/tool/` — autonomous market-agent building blocks
- `contracts/` — Solidity market contract, Foundry test, and deploy script
- `src/lib/` — Ritual chain configuration and shared market types
- `public/` — logo, music, and static browser assets
- `index.html` — static repository entry page; Next.js runs from `src/app/`
- `scripts/` — local-key deployment and read-only chain checks
- `test/` — Solidity compile and frontend state tests

Market discovery currently reads Polymarket public data, while news intelligence reads GDELT. They are external discovery signals; settlement and position custody belong to the configured Ritual contract.

## Safety

- Use a fresh testnet wallet with only test funds.
- Keep `.env.local` out of version control.
- Do not deploy the contract to mainnet without an independent security review.
- AI/news signals are informational and do not guarantee outcomes.
