# OphirPay

**Stellar-native payment orchestration platform** — simplifies, automates, and provides visibility into blockchain-based payments for individuals, businesses, nonprofits, and DAOs.

Built on the [Stellar](https://stellar.org) network with [Soroban](https://soroban.stellar.org) smart contract support.

[![CI](https://github.com/OphirPay/OphirPay/actions/workflows/ci.yml/badge.svg)](https://github.com/OphirPay/OphirPay/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-23%20passed-brightgreen.svg)](src/__tests__/)
[![Vercel](https://img.shields.io/badge/vercel-deployed-black.svg?logo=vercel)](https://ophirpay.vercel.app)
[![Demo](https://img.shields.io/badge/demo-video-8A2BE2.svg?logo=video)](./public/demo.mp4)
[![Contract](https://img.shields.io/badge/contract-stellar%20testnet-7B68EE.svg)](https://stellar.expert/explorer/testnet/contract/CDPYJWGBQI3PDWF3Q47SFIXI35OC6A2ADVH5WWDHRGFSXTIJADNPL55W)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-orange.svg)]()

---

## 📋 Features

- **Wallet Connection** — Connect your Freighter wallet to Stellar Testnet with one click
- **Real-Time Balance** — View your XLM balance fetched live from the Stellar network
- **Send Payments** — Send XLM transactions with Freighter signing, tx hash feedback, and explorer links
- **Batch Payments** — Process multiple payments in a single transaction
- **Payment Dashboard** — Track payment history, statuses, and transaction details
- **Smart Contracts** — Soroban contract deployment and interaction via `/contracts`
- **Event Streaming** — Real-time SSE event feed at `/events` for payment lifecycle tracking
- **Inter-Contract Communication** — `PaymentEventEmitter` contract receives cross-contract events from the main OphirPay contract on every payment creation
- **Mobile Responsive** — Fully responsive with hamburger sidebar for mobile devices
- **Error Handling** — Error boundaries, loading skeletons, and classified contract errors
- **CI/CD Pipeline** — GitHub Actions workflow with build, lint, test, and typecheck

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | [Next.js 15](https://nextjs.org) + TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Testing | [Vitest](https://vitest.dev) + React Testing Library |
| Blockchain | [Stellar](https://stellar.org) + [Soroban](https://soroban.stellar.org) SDK v13 |
| Wallet | [Freighter](https://freighter.app) browser extension |
| Database | [Prisma](https://prisma.io) + SQLite |
| CI/CD | [GitHub Actions](https://github.com/features/actions) |
| Hosting | [Vercel](https://vercel.com) |
| Network | Stellar Testnet |

---

## 🌐 Live Demo

🚀 **[ophirpay.vercel.app](https://ophirpay.vercel.app)** — deployed on Vercel with automatic builds from `main`.

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** 18+ and **npm**
- [**Freighter Browser Extension**](https://freighter.app) installed in Chrome/Firefox
- A funded Stellar Testnet account (use [Stellar Friendbot](https://laboratory.stellar.org/#account-creator?network=test) to fund)

### 1. Clone the repository

```bash
git clone https://github.com/OphirPay/OphirPay.git
cd OphirPay
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

```bash
npx prisma db push
npx prisma generate
```

### 4. Configure environment

```bash
cp .env.example .env
```

Default environment variables:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_STELLAR_NETWORK="TESTNET"
NEXT_PUBLIC_STELLAR_RPC_URL="https://soroban-testnet.stellar.org:443"
NEXT_PUBLIC_STELLAR_HORIZON_URL="https://horizon-testnet.stellar.org"
NEXT_PUBLIC_CONTRACT_ID="CDPYJWGBQI3PDWF3Q47SFIXI35OC6A2ADVH5WWDHRGFSXTIJADNPL55W"
NEXT_PUBLIC_EMITTER_CONTRACT_ID="CA6LAPR4OWABPWORBQGK5O5H5S62GIPQBKP3PH7H2DQ3ZNSWSH3RHFE4"
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Full CI pipeline (typecheck + lint + test + build)
npm run ci
```

**23 tests passing** across 3 test suites:
- `src/__tests__/utils.test.ts` — Utility functions (shortenAddress, formatAmount, getStatusColor, timeAgo, cn)
- `src/__tests__/contracts.test.ts` — Contract error classification (NETWORK, CONTRACT, USER_REJECTION)
- `src/__tests__/stellar.test.ts` — Stellar SDK helpers (address validation, explorer URLs)

![Test Output](./public/screenshots/test-output.png)

---

## 🔄 CI/CD Pipeline

[![OphirPay CI/CD](https://github.com/OphirPay/OphirPay/actions/workflows/ci.yml/badge.svg)](https://github.com/OphirPay/OphirPay/actions/workflows/ci.yml)

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main`:

1. **Checkout** — Clone the repository
2. **Setup Node.js 20** — With npm caching
3. **Install** — `npm ci`
4. **Prisma Generate** — Generate database client
5. **TypeScript Check** — `tsc --noEmit`
6. **Lint** — `next lint`
7. **Test** — `vitest run`
8. **Build** — `next build`

![CI/CD Pipeline](./public/screenshots/ci-pipeline.png)

---

## 📸 Screenshots

### Wallet Options Available
*Disconnected state showing wallet options before connecting:*
![Wallet Options](./public/screenshots/wallet-options.png)

### Mobile Responsive UI
*Dashboard on mobile with hamburger sidebar menu:*
![Mobile UI](./public/screenshots/mobile-responsive.png)

### Treasury Dashboard
*Stats cards, connected wallet balance, recent payments, quick actions:*
![Treasury Dashboard](./public/screenshots/dashboard.png)

### CI/CD Pipeline
*GitHub Actions workflow passing:*
![CI/CD Pipeline](./public/screenshots/ci-pipeline.png)

### Payments List
*Search, filter tabs, status badges, transaction links:*
![Payments List](./public/screenshots/payments.png)

### Send Payment
*Send XLM with destination, amount, memo, balance:*
![Send Payment](./public/screenshots/send-payment.png)

### Transaction Success
*TX result with hash and Stellar Expert link:*
![Transaction Success](./public/screenshots/transaction-success.png)

---

## 🏗 Architecture

### Production-Ready Patterns

- **Error Boundaries** (`src/components/ErrorBoundary.tsx`) — React error boundary catching render errors with fallback UI
- **Loading Skeletons** (`src/components/LoadingSkeleton.tsx`) — Shimmer loading states for text, card, table, and stats variants
- **3 Contract Error Types** — NETWORK, CONTRACT, USER_REJECTION classified errors
- **Mobile Responsive** — Collapsible hamburger sidebar with slide-over panel
- **Real-Time Events** — SSE endpoint at `/api/events` for live payment streaming

### Project Structure

```
src/
├── __tests__/              # Vitest test suites (23 tests)
│   ├── contracts.test.ts   # Contract error classification
│   ├── stellar.test.ts     # Stellar SDK helpers
│   └── utils.test.ts       # Utility functions
├── app/
│   ├── api/
│   │   ├── events/route.ts # SSE event streaming endpoint
│   │   ├── health/route.ts # Health check
│   │   └── batches/route.ts# Batch CRUD API
│   ├── contracts/page.tsx  # Smart contract interaction
│   ├── events/page.tsx     # Live event feed
│   ├── send/page.tsx       # Send payment flow
│   ├── page.tsx            # Treasury Dashboard
│   └── ...
├── components/
│   ├── ErrorBoundary.tsx   # React error boundary
│   ├── LoadingSkeleton.tsx # Shimmer loading states
│   ├── AppShell.tsx        # Client shell (wallet + layout)
│   ├── WalletButton.tsx    # Connect/disconnect + balance
│   ├── Sidebar.tsx         # Mobile-responsive nav
│   └── Header.tsx          # Top header bar
├── hooks/
│   └── useFreighter.tsx    # Wallet context + hook
├── lib/
│   ├── contracts.ts        # Smart contract interaction
│   ├── stellar.ts          # Stellar SDK config
│   └── utils.ts            # Formatting utilities
├── types/
│   └── index.ts            # Shared TypeScript types
contracts/
├── ophirpay/               # Main Rust Soroban contract (payment lifecycle)
└── emitter/                # PaymentEventEmitter contract (cross-contract events)
.github/
└── workflows/ci.yml        # GitHub Actions CI/CD
scripts/
├── deploy-contract.js      # SDK deployment script
├── deploy-workflow.sh      # Automated deployment pipeline
└── capture-mockups.js      # Screenshot capture tool
```

---

## 🧪 Smart Contract Development

### 🔗 Inter-Contract Communication

OphirPay uses **two Soroban contracts** that communicate via cross-contract invocation:

```
OphirPayContract.create_payment()
  │
  ├── Stores payment in persistent storage
  └── Cross-contract call → PaymentEventEmitter.emit_payment()
        │
        └── Stores PaymentEvent record (id, payer, payee, amount, tx_hash)
```

When a payment is created on the main **OphirPayContract**, it calls `invoke_contract` on the **PaymentEventEmitter** to record a `PaymentEvent` struct. The emitter contract stores the full event data (event ID, emitter name, payer, payee, amount, transaction hash) in its persistent storage. This enables external systems to query emitted payment events independently without touching the main payment contract.

---

### 📦 Main Contract — OphirPay

| Detail | Value |
|---|---|
| Contract ID | `CDPYJWGBQI3PDWF3Q47SFIXI35OC6A2ADVH5WWDHRGFSXTIJADNPL55W` |
| Network | Stellar Testnet |
| WASM Hash | `bf9500e70231177eaddd78e92f2a2b1c490d07040a3b72a2dc70b871c107cbd8` |
| Deploy TX | [`29879bd9...`](https://stellar.expert/explorer/testnet/tx/29879bd9ab20ddfa7f4dfaf5c01fafda59831272188dbfc00790181142577e80) |
| Init TX | [`18d91f40...`](https://stellar.expert/explorer/testnet/tx/18d91f40a897eec454f3fd5011b559d114cf20b453b7b69ff9e3a84496717621) |
| Owner | `GACZ7ZELCUC5YGJ6JHIVLEZNR3XKYKOVUWD6H3IRFPRZMALNUYJZQM2U` |
| Explorer | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDPYJWGBQI3PDWF3Q47SFIXI35OC6A2ADVH5WWDHRGFSXTIJADNPL55W) |

**Functions:**

| Function | Description |
|---|---|
| `init(owner, emitter)` | Initialize with owner address and emitter contract address |
| `get_owner()` | Query contract owner |
| `get_emitter()` | Get the configured PaymentEventEmitter contract address |
| `create_payment(payer, payee, amount, tx_hash)` | Store payment + cross-contract emit event |
| `get_payment(id)` | Retrieve payment by ID |
| `get_payment_count()` | Total payments stored |

---

### 📡 Emitter Contract — PaymentEventEmitter

| Detail | Value |
|---|---|
| Contract ID | `CA6LAPR4OWABPWORBQGK5O5H5S62GIPQBKP3PH7H2DQ3ZNSWSH3RHFE4` |
| Network | Stellar Testnet |
| Purpose | Receives cross-contract payment events from OphirPayContract |
| Explorer | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CA6LAPR4OWABPWORBQGK5O5H5S62GIPQBKP3PH7H2DQ3ZNSWSH3RHFE4) |

**Functions:**

| Function | Description |
|---|---|
| `init(owner)` | Initialize with owner address |
| `get_owner()` | Query emitter owner |
| `emit_payment(emitter, payer, payee, amount, tx_hash)` | Store PaymentEvent in persistent storage |
| `get_event(event_id)` | Retrieve event by ID |
| `get_event_count()` | Total events emitted |

**PaymentEvent struct:** `{ id, emitter, payer, payee, amount, tx_hash }`

---

### Building Locally

```bash
# Main contract
cd contracts/ophirpay
cargo build --target wasm32-unknown-unknown --release

# Emitter contract
cd contracts/emitter
cargo build --target wasm32-unknown-unknown --release
```

### Deployment (both contracts)

```bash
# 1. Deploy emitter first
stellar contract deploy \
  --wasm contracts/emitter/target/wasm32-unknown-unknown/release/ophirpay_emitter.wasm \
  --source-account <SECRET_KEY> \
  --rpc-url "https://soroban-testnet.stellar.org:443" \
  --network-passphrase "Test SDF Network ; September 2015"

# 2. Init emitter
stellar contract invoke \
  --id <EMITTER_CONTRACT_ID> \
  --source-account <SECRET_KEY> \
  --rpc-url "https://soroban-testnet.stellar.org:443" \
  --network-passphrase "Test SDF Network ; September 2015" \
  -- init --owner <OWNER_PUBLIC_KEY>

# 3. Deploy main contract
stellar contract deploy \
  --wasm contracts/ophirpay/target/wasm32-unknown-unknown/release/ophirpay_contract.wasm \
  --source-account <SECRET_KEY> \
  --rpc-url "https://soroban-testnet.stellar.org:443" \
  --network-passphrase "Test SDF Network ; September 2015"

# 4. Init main contract with emitter address
stellar contract invoke \
  --id <OPHIRPAY_CONTRACT_ID> \
  --source-account <SECRET_KEY> \
  --rpc-url "https://soroban-testnet.stellar.org:443" \
  --network-passphrase "Test SDF Network ; September 2015" \
  -- init --owner <OWNER_PUBLIC_KEY> --emitter <EMITTER_CONTRACT_ID>
```

### Automated Deployment Workflow

```bash
./scripts/deploy-workflow.sh <SECRET_KEY> <OWNER_PUBLIC_KEY>
```

---

## 🎥 Demo Video

▶️ **[Watch the OphirPay Demo](./public/demo.mp4)** — 1-minute walkthrough covering wallet connection, sending payments, transaction success, mobile responsive UI, CI/CD pipeline, and test suite.

<video src="./public/demo.mp4" controls width="100%" style="max-width:720px;border-radius:12px"></video>

---

## 📄 License

Open source — [MIT License](LICENSE)

---

**OphirPay** — Financial operations for the Stellar ecosystem.
