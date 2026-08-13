<div align="center">
  <img src="https://raw.githubusercontent.com/OphirPay/OphirPay/main/public/ophirpay-banner.svg" alt="OphirPay Banner" width="100%" />

  <h1>🏦 OphirPay</h1>

  <h3><em>The Open-Source Payment Orchestration Layer for Stellar</em></h3>

  <p>
    Send, batch, schedule, and track blockchain payments — all from one powerful dashboard.
    Built natively on <strong>Stellar</strong> & <strong>Soroban</strong> for individuals, startups,
    nonprofits, and DAOs who demand speed, transparency, and low fees.
  </p>

  <br />

  <p>
    <a href="https://github.com/OphirPay/OphirPay/actions/workflows/ci.yml">
      <img src="https://github.com/OphirPay/OphirPay/actions/workflows/ci.yml/badge.svg" alt="CI Status" />
    </a>
    <a href="https://github.com/OphirPay/OphirPay/actions/workflows/ci.yml">
      <img src="https://img.shields.io/badge/CI%20jobs-21-blue.svg?logo=githubactions" alt="21 CI Jobs" />
    </a>
    <a href="src/__tests__/">
      <img src="https://img.shields.io/badge/tests-864%20passed%20(800%20app%20%2B%2064%20contracts)-brightgreen.svg" alt="864 Tests Passing" />
    </a>
    <a href="docs/AUDIT.md">
      <img src="https://img.shields.io/badge/audit-manual%20review-orange.svg" alt="Manual security review completed" />
    </a>
    <a href="https://ophirpay.vercel.app">
      <img src="https://img.shields.io/badge/vercel-deployed-black.svg?logo=vercel" alt="Vercel Deployed" />
    </a>
    <a href="./public/demo.mp4">
      <img src="https://img.shields.io/badge/demo-2%20min-8A2BE2.svg?logo=video" alt="2-Minute Demo" />
    </a>
    <a href="https://stellar.expert/explorer/testnet/contract/CAW7OORNGPRBRQJIXRXZOXEPZZO3Z5FKSCLBULGLBTVVPZYYVTK2UKIA">
      <img src="https://img.shields.io/badge/contract-stellar%20testnet-7B68EE.svg" alt="Contract on Testnet" />
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" />
    </a>
  </p>

  <p>
    <sub>      <b>21 CI checks:</b>
      <img src="https://img.shields.io/badge/lint-ESLint-4c1.svg?logo=eslint" />
      <img src="https://img.shields.io/badge/typecheck-tsc-3178C6.svg?logo=typescript" />
      <img src="https://img.shields.io/badge/tests-Vitest-6E9F18.svg?logo=vitest" />
      <img src="https://img.shields.io/badge/coverage-v8-6E9F18.svg?logo=vitest" />
      <img src="https://img.shields.io/badge/formal%20verification-model-only%20(pending)-yellow.svg?logo=rust" />
      <img src="https://img.shields.io/badge/contracts-Rust%20WASM-DEA584.svg?logo=rust" />
      <img src="https://img.shields.io/badge/clippy-Rust%20Lint-DEA584.svg?logo=rust" />
      <img src="https://img.shields.io/badge/fmt-rustfmt-DEA584.svg?logo=rust" />
      <img src="https://img.shields.io/badge/build-Next.js-black.svg?logo=nextdotjs" />
      <img src="https://img.shields.io/badge/smoke-19%20pages-000.svg?logo=vercel" />
      <img src="https://img.shields.io/badge/e2e-Playwright-2EAD33.svg?logo=playwright" />
      <img src="https://img.shields.io/badge/schema-Prisma-2D3748.svg?logo=prisma" />
      <img src="https://img.shields.io/badge/secrets-Gitleaks-FF4B4B.svg?logo=shield" />
      <img src="https://img.shields.io/badge/docker-Build-2496ED.svg?logo=docker" />
      <img src="https://img.shields.io/badge/bundle-Size%20Check-F7DF1E.svg?logo=javascript" />
      <img src="https://img.shields.io/badge/a11y-axe%20core-6B46C1.svg?logo=axe" />
      <img src="https://img.shields.io/badge/openapi-Redocly-000.svg?logo=openapiinitiative" />
      <img src="https://img.shields.io/badge/spell-typos-lightgrey.svg?logo=textpattern" />
      <img src="https://img.shields.io/badge/manifests-kubeconform-326CE5.svg?logo=kubernetes" />
      <img src="https://img.shields.io/badge/chart-Helm%20Lint-0F1689.svg?logo=helm" />
      <img src="https://img.shields.io/badge/gas-Soroban%20Analyze-7B68EE.svg?logo=stellar" />
      <img src="https://img.shields.io/badge/audit-npm-CB3837.svg?logo=npm" />
    </sub>
  </p>
      <img src="https://img.shields.io/badge/version-v0.1.0-blue.svg" alt="v0.1.0" />
    </a>
  </p>
</div>

---

## 📑 Table of Contents

- [✨ Why OphirPay?](#-why-ophirpay)
- [🚀 Live Demo](#-live-demo)
- [🧭 System Architecture](#-system-architecture)
- [⚡ Quick Start](#-quick-start)
- [🔐 Wallet Integration](#-wallet-integration)
- [📡 Real-Time Events](#-real-time-events)
- [🧪 Smart Contracts](#-smart-contracts)
- [📊 Testing & Quality](#-testing--quality)
- [🔄 CI/CD Pipeline](#-cicd-pipeline)
- [📸 Screenshots](#-screenshots)
- [🛠 Tech Stack](#-tech-stack)
- [🤝 Contributing](#-contributing)
- [🗺 Roadmap](#-roadmap)
- [🔒 Security](#-security)
- [📄 License & Credits](#-license--credits)

---

## ✨ Why OphirPay?

Most blockchain payment tools are either developer-facing SDKs or complex enterprise dashboards. **OphirPay bridges the gap** — a production-grade, open-source payment platform that's powerful enough for DAO treasuries yet intuitive enough for a freelancer sending their first crypto payment.

| Capability | OphirPay | Typical dApp |
|---|---|---|
| Single payments | ✅ | ✅ |
| **Batch payments** (multi-recipient in 1 tx) | ✅ | ❌ |
| **Recurring payment schedules** | ✅ | ❌ |
| **Payment requests** (invoice-style, QR codes) | ✅ | ❌ |
| **Real-time event streaming** (SSE) | ✅ | ❌ |
| **Webhook delivery** (HMAC signed, retries) | ✅ | ❌ |
| **Cross-contract communication** | ✅ | ❌ |
| **Multi-wallet support** (6 wallets: Freighter, xBull, Rabet, Albedo, Lobstr, Ledger) | ✅ | ❌ |
| **Multi-asset support** (USDC, custom tokens) | ✅ | ❌ |
| **PWA with offline support** | ✅ | ❌ |
| **Classified error handling** (3 types) | ✅ | ❌ |
| **Production error boundaries** | ✅ | ❌ |
| **PostgreSQL + SQLite** (provider switching) | ✅ | ⚠️ |
| **Multisig approvals** (N-of-M signers) | ✅ | ❌ |
| **Spending limits + escalation tiers** | ✅ | ❌ |
| **RBAC** (Admin/Operator/Auditor roles) | ✅ | ❌ |
| **On-chain audit log** (immutable trail) | ✅ | ❌ |
| **Fee configuration** (per-operation bps) | ✅ | ❌ |
| **Timelocked admin actions** (24h delay) | ✅ | ❌ |
| **DAO governance** (propose→vote→execute) | ✅ | ❌ |
| **Structured refund system** (6 reason codes, analytics) | ✅ | ❌ |
| **On-chain notification hooks** (subscriber-indexed) | ✅ | ❌ |
| **Cross-contract orchestration** (atomic pause_all) | ✅ | ❌ |
| **Policy versioning** (immutable config history) | ✅ | ❌ |
| **Two-step admin rotation** (24h timelock) | ✅ | ❌ |

> All features above have dashboard UI pages. See [roadmap](#-roadmap) for details.

| **Full CI/CD + 864 tests (800 app + 64 contracts)** | ✅ | ⚠️ |

---

## 🚀 Live Demo

<div align="center">

### 🔗 **[ophirpay.vercel.app](https://ophirpay.vercel.app)**

*Deployed on Vercel — automatic builds from `main` on every push.*

### 🎥 Demo Video (2.5 min)

<video src="https://raw.githubusercontent.com/OphirPay/OphirPay/main/public/demo.mp4" controls width="720" poster="https://raw.githubusercontent.com/OphirPay/OphirPay/main/public/ophirpay-banner.svg" style="max-width:100%;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15)">
  Your browser does not support embedded video.
  <a href="https://ophirpay.vercel.app/demo.mp4">Watch on Vercel →</a>
</video>

*15 slides: Dashboard → Send → Payments → Escrows → Batches → Recurring → Multisig → Governance → Contracts → RBAC → Fee Config → Timelock → Events → Analytics → Mobile*

</div>

---

## 🧭 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     OPHIRPAY PLATFORM                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐ │
│  │ Treasury │   │  Send    │   │ Batches  │   │Contracts│ │
│  │ Dashboard│   │ Payment  │   │  (multi) │   │  Page   │ │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬────┘ │
│       │              │              │              │       │
│  ┌────┴──────────────┴──────────────┴──────────────┴────┐  │
│  │              useWallet() / WalletProvider             │  │
│  │          Session persistence · Balance · Auth         │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                │
│  ┌────────────────────────┼─────────────────────────────┐  │
│  │                  Stellar SDK Layer                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │  │
│  │  │ Horizon  │  │ Soroban  │  │  TX Builder/Signer │  │  │
│  │  │ (balance)│  │   RPC    │  │  (buildInvokeTx)   │  │  │
│  │  └──────────┘  └──────────┘  └────────────────────┘  │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                │
│  ┌────────────────────────┴─────────────────────────────┐  │
│  │                 Soroban Smart Contracts                │  │
│  │                                                       │  │
│  │  ┌──────────────────┐    cross-contract   ┌─────────┐ │  │
│  │  │ OphirPayContract │ ───────────────────→ │ Emitter │ │  │
│  │  │  · record_payment│    invoke_contract   │ Contract│ │  │
│  │  │  · create_escrow │                      │· events │ │  │
│  │  │  · grant_role    │                      └────┬────┘ │  │
│  │  │  · set_fee_config│                           │      │  │
│  │  │  · 50+ functions │                           │      │  │
│  │  └──────────────────┘                          │      │  │
│  └────────────────────────────────────────────────┼──────┘  │
│                                                   │         │
│  ┌────────────────────────────────────────────────┴──────┐  │
│  │            SSE Event Stream (GET /api/events)          │  │
│  │       Polls emitter contract → streams to UI           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Data Layer                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │  Prisma  │  │  SQLite  │  │  API Routes      │   │   │
│  │  │  (ORM)   │  │  (local) │  │  /api/batches    │   │   │
│  │  │          │  │          │  │  /api/health     │   │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Hackathon Quickstart (60 seconds)

```bash
git clone https://github.com/OphirPay/OphirPay.git && cd OphirPay
npm install && npx prisma db push && npx prisma generate
cp .env.example .env && npm run dev
```

**That's it!** Open http://localhost:3000, connect Freighter, and you're live on Stellar Testnet.

Run the pre-demo smoke test to verify everything works:
```bash
bash scripts/demo-test.sh
```

---

## ⚡ Quick Start

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org) | 18+ | Runtime |
| [Freighter Wallet](https://freighter.app) | Latest | Browser extension for Stellar |
| [Git](https://git-scm.com) | Any | Clone the repo |
| A funded Testnet account | — | Get free XLM from [Friendbot](https://laboratory.stellar.org/#account-creator?network=test) |

### 5-Minute Setup

```bash
# 1. Clone & enter
git clone https://github.com/OphirPay/OphirPay.git && cd OphirPay

# 2. Install everything
npm install

# 3. Initialize database
npx prisma db push && npx prisma generate

# 4. Copy environment template
cp .env.example .env

# 5. Launch!
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — connect your Freighter wallet and you're ready to send Testnet XLM.

<details>
<summary><strong>📋 Environment Variables Reference</strong></summary>

```env
# Database
DATABASE_URL="file:./dev.db"

# Stellar Network (swap TESTNET → PUBLIC for mainnet!)
NEXT_PUBLIC_STELLAR_NETWORK="TESTNET"
NEXT_PUBLIC_STELLAR_RPC_URL="https://soroban-testnet.stellar.org:443"
NEXT_PUBLIC_STELLAR_HORIZON_URL="https://horizon-testnet.stellar.org"
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Soroban Contracts (deployed on testnet)
NEXT_PUBLIC_CONTRACT_ID="CAW7OORNGPRBRQJIXRXZOXEPZZO3Z5FKSCLBULGLBTVVPZYYVTK2UKIA"
NEXT_PUBLIC_EMITTER_CONTRACT_ID="CCMXLNRPBTHVTEH7UEBXQVZ4YJZB5NN7LXJBAL465A6YFXJPJGV2CYPX"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> ⚡ **Mainnet migration**: Change `NEXT_PUBLIC_STELLAR_NETWORK="PUBLIC"` and update RPC/Horizon URLs. That's it.
</details>

---

## 🔐 Wallet Integration

OphirPay supports multiple Stellar wallets through a unified connector abstraction. Our `MultiWalletProvider` context wraps the entire application, providing:

| Feature | Implementation |
|---|---|
| **Multi-wallet** | Connector interface for Freighter, Albedo, xBull, Ledger |
| **Connect** | Wallet selector modal → `connector.connect()` |
| **Disconnect** | Full state reset + connector-specific cleanup |
| **Session persistence** | Auto-detects existing connections on page load |
| **Missing wallet** | Graceful detection — "Not found" badge + actionable error |
| **Rejected connection** | Caught, displayed as inline error |
| **Balance refresh** | Manual refresh button + auto-refresh after send |
| **Loading states** | `balanceLoading` flag → skeleton shimmer |
| **Network badge** | Live indicator showing TESTNET/PUBLIC with status dot |

**Supported wallets:**

| Wallet | Type | Status |
|---|---|---|
| Freighter | Browser extension | ✅ Supported |
| xBull | Browser extension | ✅ Supported |
| Rabet | Browser extension | ✅ Supported |
| Albedo | Web-based (no extension) | ✅ Supported |
| Lobstr | Web-based (SEP-7) | ✅ Supported |
| Ledger | Hardware (WebUSB/HID) | ✅ Supported |

```tsx
// Consuming the wallet anywhere in your app
const { wallet, connect, disconnect, fetchBalance } = useWallet();

// wallet.connected      → boolean
// wallet.publicKey      → "GABCD..."
// wallet.balance        → "12500.50"
// wallet.network        → "TESTNET"
// wallet.activeWalletId → "freighter" | "albedo" | "xbull"

// Connect a specific wallet
connect("albedo");  // or "freighter", "xbull"
```

---

## 📡 Real-Time Events

OphirPay streams **live blockchain events** via Server-Sent Events (SSE). The endpoint polls the deployed `PaymentEventEmitter` contract every 10 seconds, detecting new payment events and pushing them to connected clients.

```
Browser ←──SSE stream─── GET /api/events ──polls──→ PaymentEventEmitter (Soroban)
                                                      ↓
                                                 get_event_count()
                                                 get_event(id)
```

**Events emitted:**

| Event | Trigger |
|---|---|
| `connected` | Stream established |
| `heartbeat` | Every 15 seconds (keep-alive) |
| `payment:created` | New payment event detected on-chain |

Visit **`/events`** in the app to see the live feed with connection status indicator, event type badges, timestamps, and auto-scroll.

---

## 🧪 Smart Contracts

OphirPay deploys **two Soroban contracts** that communicate via cross-contract invocation — a pattern that separates payment logic from event emission for cleaner architecture and independent queryability.

### 🔗 Inter-Contract Flow

```
OphirPayContract.create_payment(payer, payee, amount, tx_hash)
  │
  ├─ 1. Increments payment counter
  ├─ 2. Stores Payment struct in persistent storage
  └─ 3. env.invoke_contract(emitter, "emit_payment", args)
        │
        └─ PaymentEventEmitter.emit_payment(emitter, payer, payee, amount, tx_hash)
              │
              └─ Stores PaymentEvent { id, emitter, payer, payee, amount, tx_hash }
```

### 📦 Main Contract — `OphirPayContract`

| Detail | Value |
|---|---|
| **Contract ID** | `CAW7OORNGPRBRQJIXRXZOXEPZZO3Z5FKSCLBULGLBTVVPZYYVTK2UKIA` |
| **Network** | Stellar Testnet |
| **WASM Hash** | `44ac9d15...` |
| **Deploy TX** | Verified on-chain |
| **Cross-Contract TX** | Verified on-chain |
| **Explorer** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAW7OORNGPRBRQJIXRXZOXEPZZO3Z5FKSCLBULGLBTVVPZYYVTK2UKIA) |

| Function | Access | Description |
|---|---|---|
| `init(owner, emitter)` | Admin | Initialize contract with owner & emitter address |
| `create_payment(...)` | Public | Store payment + cross-contract emit event |
| `create_escrow(...)` | Public | Create time-locked escrow with SAC token transfer |
| `create_stream(...)` | Public | Create recurring payment stream |
| `create_batch(...)` | Public | Record multiple payments in one transaction |
| `approve_payment(id)` | Multisig | Approve a multisig payment request |
| `execute_approved_payment(id)` | Multisig | Execute an approved payment |
| `grant_role(grantee, role)` | Admin | Grant RBAC role (Admin/Operator/Auditor) |
| `revoke_role(grantee)` | Admin | Revoke a role |
| `set_fee_config(...)` | Admin | Configure per-operation fee basis points |
| `propose_timelocked_action(...)` | Admin | Propose admin action with mandatory delay |
| `execute_timelocked_action(id)` | Admin | Execute after delay expires |
| `create_proposal(...)` | Governance | Create DAO governance proposal |
| `vote_on_proposal(id, support)` | Governance | Vote YES/NO on a proposal |
| `request_refund(...)` | Public | Request refund with 6 reason codes |
| `emergency_pause_all()` | Admin | Atomic cross-contract pause |
| `get_payment(id)` | Read | Retrieve payment by ID |
| `get_stats()` | Read | All 11 counters (gas-optimized) |
| `get_fee_config()` | Read | Current fee configuration |
| `calculate_fee(...)` | Read | Pure computation, 0 storage |

### 📡 Emitter Contract — `PaymentEventEmitter`

| Detail | Value |
|---|---|
| **Contract ID** | `CCMXLNRPBTHVTEH7UEBXQVZ4YJZB5NN7LXJBAL465A6YFXJPJGV2CYPX` |
| **Purpose** | Receives cross-contract payment events |
| **Explorer** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCMXLNRPBTHVTEH7UEBXQVZ4YJZB5NN7LXJBAL465A6YFXJPJGV2CYPX) |

| Function | Access | Description |
|---|---|---|
| `init(owner)` | Admin | Initialize emitter |
| `emit_payment(emitter, payer, payee, amount, tx_hash)` | Cross-contract | Store PaymentEvent |
| `get_event(event_id)` | Read | Retrieve event by ID |
| `get_event_count()` | Read | Total events emitted |
| `get_owner()` | Read | Query emitter owner |

### 🔨 Building & Deploying

<details>
<summary><strong>Build from source</strong></summary>

```bash
# Build both contracts to WASM
cd contracts/ophirpay && cargo build --target wasm32v1-none --release
cd contracts/emitter && cargo build --target wasm32v1-none --release
```
</details>

<details>
<summary><strong>Manual deployment (4 steps)</strong></summary>

```bash
# 1. Deploy emitter
stellar contract deploy \
  --wasm contracts/emitter/target/wasm32v1-none/release/ophirpay_emitter.wasm \
  --source-account <SECRET_KEY> \
  --rpc-url "https://soroban-testnet.stellar.org:443" \
  --network-passphrase "Test SDF Network ; September 2015"

# 2. Init emitter
stellar contract invoke --id <EMITTER_ID> --source-account <SECRET_KEY> \
  --rpc-url "https://soroban-testnet.stellar.org:443" \
  --network-passphrase "Test SDF Network ; September 2015" \
  -- init --owner <OWNER_PUBLIC_KEY>

# 3. Deploy main contract
stellar contract deploy \
  --wasm contracts/ophirpay/target/wasm32v1-none/release/ophirpay_contract.wasm \
  --source-account <SECRET_KEY> \
  --rpc-url "https://soroban-testnet.stellar.org:443" \
  --network-passphrase "Test SDF Network ; September 2015"

# 4. Init main contract with emitter
stellar contract invoke --id <OPHIRPAY_ID> --source-account <SECRET_KEY> \
  --rpc-url "https://soroban-testnet.stellar.org:443" \
  --network-passphrase "Test SDF Network ; September 2015" \
  -- init --owner <OWNER_PUBLIC_KEY> --emitter <EMITTER_ID>
```
</details>

<details>
<summary><strong>⚡ One-command automated deploy</strong></summary>

```bash
./scripts/deploy-workflow.sh <SECRET_KEY> <OWNER_PUBLIC_KEY> <EMITTER_CONTRACT_ID>
```
Automatically builds WASM, uploads, deploys, initializes, and verifies both contracts.
</details>

---

## 🧪 Smart Contract Tests

Both Soroban contracts include comprehensive `#[cfg(test)]` unit test modules (64 tests total):

| Contract | Tests | Coverage |
|---|---|---|
| `OphirPayContract` | 58 tests | init, payments, escrows, streams, batches, multisig, RBAC, fee config, timelock, governance, refunds, pause, stats, invariants |
| `PaymentEventEmitter` | 6 tests | init, emit, get, count, pause/unpause, access control |

```bash
# Run contract tests
cd contracts/ophirpay && cargo test
cd contracts/emitter && cargo test
```

---

## 📊 Testing & Quality

```bash
# All tests (864 total: 800 app + 64 contracts)
npm test

# Watch mode
npm run test:watch

# Full CI pipeline
npm run ci   # typecheck → lint → test → build
```

All app tests live in `src/__tests__/` (32 files, 800 cases):

| File | Test cases |
|---|---|
| `api-response.test.ts` | 19 |
| `api-response-branches.test.ts` | 29 |
| `auth.test.ts` | 26 |
| `auth-session.test.ts` | 13 |
| `challenge.test.ts` | 11 |
| `contract-utils.test.ts` | 8 |
| `contracts.test.ts` | 6 |
| `csrf.test.ts` | 9 |
| `error-codes.test.ts` | 21 |
| `integration.test.ts` | 21 |
| `lib-coverage.test.ts` | 74 |
| `lib-coverage-2.test.ts` | 45 |
| `lib-coverage-3.test.ts` | 24 |
| `lib-coverage-4.test.ts` | 31 |
| `lib-coverage-5.test.ts` | 27 |
| `lib-coverage-6.test.ts` | 167 |
| `request-id.test.ts` | 7 |
| `stellar.test.ts` | 5 |
| `transaction-simulator.test.ts` | 5 |
| `type-guards.test.ts` | 13 |
| `utils.test.ts` | 12 |
| `utils-extended.test.ts` | 20 |
| `validation.test.ts` | 26 |
| `validation-schemas.test.ts` | 5 |
| `webhook-url-guard.test.ts` | 9 |
| `branch-coverage.test.tsx` | 66 |
| `error-boundary.test.tsx` | 4 |
| `lib-coverage-6-hooks.test.tsx` | 22 |
| `loading-boundary.test.tsx` | 4 |
| `ui-components.test.tsx` | 17 |
| `ui-components-2.test.tsx` | 25 |
| `ui-hooks-coverage.test.tsx` | 29 |
| **Total** | **800** |

### Error Classification System

All contract failures route through a 3-tier classifier:

| Type | Icon | Examples |
|---|---|---|
| `NETWORK` | 🌐 | RPC timeout, DNS failure, `ECONNREFUSED` |
| `CONTRACT` | 📜 | HostError, panics, SCError, bad args |
| `USER_REJECTION` | 🚫 | User declined Freighter prompt |

Each type renders with distinct colors (yellow/red/orange) and actionable messaging in the UI.

---

## 🔄 CI/CD Pipeline

Every push to `main` triggers:

```
┌─ Frontend ──────────────────────────────────────────┐  ┌─ Backend ───────────────┐
│ Lint → TypeCheck → Unit Tests → Coverage → Build → Smoke │  │ Contracts → Prisma → Audit │
└─────────────────────────────────────────────────────┘  └──────────────────────────┘
                              ┌─ Infra ──┐
                              │ K8s → Helm │
                              └───────────┘
```

### Frontend (6 jobs)

| Job | Command | Purpose |
|---|---|---|
| Lint | `npx eslint . --max-warnings 20` | ESLint with zero-error tolerance |
| TypeCheck | `tsc --noEmit` | Full project strict type-checking |
| Unit Tests | `vitest run --reporter=verbose` | 800 app tests across 32 suites |
| Coverage | `vitest run --coverage` | v8 coverage report + CI artifact |
| Build | `next build` | Production Next.js build verification |
| Smoke | curl (19 pages) | HTTP 200 check against live Vercel — ~3s |

### Backend (3 jobs)

| Job | Command | Purpose |
|---|---|---|
| Contracts | `cargo build --target wasm32v1-none` | Both Soroban contracts to WASM |
| Prisma | `prisma validate` + `prisma db push` | Schema integrity + runtime DB test |
| Audit | `npm audit` | Dependency vulnerability scan |

### Infra + Meta (3 jobs)

| Job | Command | Purpose |
|---|---|---|
| K8s | `kubeconform -strict` | Kubernetes manifest validation |
| Helm | `helm lint --strict` | Chart validation + template render |
| Scorecard | OpenSSF (weekly) | Security best-practices analysis |
| PR Labeler | Auto-label PRs | Adds labels by changed paths |

**→ [View latest CI run](https://github.com/OphirPay/OphirPay/actions/workflows/ci.yml)**

![CI/CD Pipeline](./public/screenshots/ci-pipeline.png)

---

## 📸 Screenshots

<div align="center">

### 🎥 [Watch the Demo Video (2.5 min)](./public/demo.mp4)

*15 slides: Dashboard → Send → Payments → Escrows → Batches → Recurring → Multisig → Governance → Contracts → RBAC → Fee Config → Timelock → Events → Analytics → Mobile*

> The demo video above is captured from the live Vercel deployment and embedded in the README. For static screenshots, see the [public/screenshots](./public/screenshots/) directory.

### Reproducing the demo assets

All demo assets are generated from checked-in scripts — no hand-edited media:

```bash
# 1. Seed the database and start the app (demo mode)
./scripts/demo-seed.sh

# 2. Static UI screenshots (from scripts/mockups/*.html) → public/screenshots/
node scripts/capture-mockups.js

# 3. Demo video (captures the running app; compile step needs FFmpeg)
node scripts/create-demo-video.js   # FFMPEG_PATH=/path/to/ffmpeg node ...
```

The video script captures each slide from a running deployment (set `BASE_URL`
in the script to point at your local dev server instead of the live site) and
compiles frames with FFmpeg. FFmpeg is resolved from `FFMPEG_PATH`, a few
known `/tmp` static-download locations, or `PATH`. `public/demo.mp4` and
`public/screenshots/` are the outputs referenced by this README.

</div>

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) | App Router, SSR, API routes, Vercel native |
| **Language** | [TypeScript](https://www.typescriptlang.org) | Strict mode, full type safety |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) | Utility-first, dark mode, custom theme |
| **Blockchain** | [Stellar SDK v13](https://stellar.org) + [Soroban](https://soroban.stellar.org) | Horizon, Soroban RPC, TX building |
| **Contracts** | [Rust](https://www.rust-lang.org) + `soroban-sdk` | WASM compilation, cross-contract invocation |
| **Wallet** | [Freighter](https://freighter.app) · [xBull](https://xbull.app) · [Rabet](https://rabet.io) · [Albedo](https://albedo.link) · [Lobstr](https://lobstr.co) · [Ledger](https://ledger.com) | 6-wallet connector abstraction |
| **Database** | [Prisma](https://prisma.io) + SQLite / PostgreSQL | Type-safe ORM, provider switching |
| **Testing** | [Vitest](https://vitest.dev) + React Testing Library | Fast, Vite-native test runner |
| **CI/CD** | [GitHub Actions](https://github.com/features/actions) | Build, lint, test, typecheck on push |
| **Hosting** | [Vercel](https://vercel.com) | Auto-deploy from `main`, edge network |

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/amazing-feature`
3. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to your fork: `git push origin feat/amazing-feature`
5. **Open** a Pull Request against `main`

### Development Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run all tests
npm run test:watch   # Watch mode
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run ci           # Full pipeline
npm run db:studio    # Prisma Studio GUI
```

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org):
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `test:` — tests
- `ci:` — CI/CD changes
- `chore:` — maintenance

---

## 🗺 Roadmap

| Milestone | Status |
|---|---|
| ✅ Wallet connect/disconnect + balance | **Done** |
| ✅ Send XLM with Freighter signing | **Done** |
| ✅ Batch payments (multi-recipient) | **Done** |
| ✅ Soroban contract deployed (Stellar Testnet) | **Done** |
| ✅ Cross-contract communication | **Done** |
| ✅ SSE event streaming from chain | **Done** |
| ✅ Mobile responsive UI | **Done** |
| ✅ CI/CD pipeline + 800 app tests + 64 contract tests | **Done** |
| ✅ Multi-wallet support (Freighter, Albedo, xBull) | **Done** |
| ✅ Stellar assets (USDC, custom tokens, trustline checks) | **Done** |
| ✅ Payment request links (shareable invoices, QR codes) | **Done** |
| ✅ Webhook delivery (HMAC signed, retries) | **Done** |
| ✅ PostgreSQL support (provider switching, migrations) | **Done** |
| ✅ PWA / mobile app (offline support, install prompt) | **Done** |
| ✅ Multisig approvals (N-of-M, propose/approve/execute, full UI) | **Done** |
| ✅ Spending limits + escalation tiers | **Done** |
| ✅ RBAC (Admin/Operator/Auditor) — full-stack + dashboard UI | **Done** |
| ✅ On-chain immutable audit log — full-stack + SSE streaming | **Done** |
| ✅ Recurring payment scheduler — contract + API + dashboard UI | **Done** |
| ✅ Fee configuration per operation — full-stack + version history | **Done** |
| ✅ Timelocked admin actions (24h delay) — full-stack | **Done** |
| ✅ DAO governance (propose→vote→execute) — full-stack | **Done** |
| ✅ Structured refund system (6 reason codes) — full-stack | **Done** |
| ✅ On-chain notification hooks — contract + relayer + UI | **Done** |
| ✅ Cross-contract orchestration (atomic pause_all) | **Done** |
| ✅ Policy versioning (immutable config history, capped at 100) | **Done** |
| ✅ Two-step admin rotation (24h timelock) | **Done** |
| ✅ soroban-sdk 27 upgrade — 58 contract unit tests green in CI (was 0) | **Done** |
| ✅ Gas optimization (92% storage savings, avg 90K stroops) | **Done** |
| ✅ Testnet deployment (both contracts live, verified on-chain) | **Done** |
| ✅ Demo video v2.0 — 15 slides, 2.5 min, live Vercel capture | **Done** |
| 🔜 Mainnet deployment | Planned |

---

## 🔬 Formal Verification

> ⚠️ **Honest status:** the Kani harnesses in `contracts/ophirpay/spec/` verify hand-written
> **models** — they share no code with the deployed `OphirPayContract`, are not run in CI, and
> several are tautological. The list below reflects *modeled intent*, **not** proof of the deployed
> contract. See [docs/AUDIT.md](docs/AUDIT.md) for details.

| # | Invariant | Status |
|---|-----------|--------|
| 1 | **LOCKED_BALANCE Protection** — `emergency_withdraw` cannot drain user funds | ⚠️ Model only — see HIGH-1 in audit |
| 2 | **One Address = One Vote** — no double-voting per proposal | ⚠️ Model only |
| 3 | **Reentrancy Lock Atomicity** — lock acquired before cross-contract calls | ⚠️ Model only — see MEDIUM-4 in audit |
| 4 | **Proposal Deposit Lifecycle** — deposit always refunded on execution | ⚠️ Model only |
| 5 | **Fee Cap (10% max)** — no fee config exceeds 1000 bps | ⚠️ Model only |
| 6 | **Multisig Threshold** — N-of-M enforcement before execution | ⚠️ Model only |
| 7 | **Timelock 24h Delay** — exactly 86400 seconds enforced | ⚠️ Model only — not wired to admin fns |
| 8 | **Spending Limit Expiry** — expired/inactive limits always reject | ⚠️ Model only — `check_spending` omits expiry |

**Run the (model) proofs:**
```bash
cargo install kani-verifier && cargo kani setup
cd contracts/ophirpay/spec && cargo kani
```

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for setup and the Certora/Komet roadmap.

---

## 🛡️ Security Audit

A **manual security review** of both Soroban contracts was completed on 2026-08-13. The full
report lives in **[docs/AUDIT.md](docs/AUDIT.md)**.

**Findings summary:**

| Severity | Count | Headline |
|---|---|---|
| Critical | 0 | — |
| High | 2 | Refund path bypasses `LOCKED_BALANCE` (owner can drain user funds); "10/10 formally verified" claim is not substantiated |
| Medium | 6 | Unauthenticated `check_spending` mutation · unbounded enumeration · unallowlisted emitter · incomplete reentrancy coverage · `emergency_pause_all` ignores cross-contract result · SSRF bypass via webhook redirects |
| Low | 11 | Vesting overflow, missing pause guards on refunds, webhook HMAC body mismatch, plain SHA-256 API keys, error-code inflation, misc |
| Informational | 5 | Admin actions not timelocked on-chain, permissionless executors, untrusted on-chain records |

**Status:** ⚠️ **Not yet audited by a third party.** The codebase is *audit-ready*, but the
findings above should be remediated and an independent audit (Runtime Verification, Certora,
Trail of Bits, or OtterSec) commissioned before mainnet deployment.

---

## 🔒 Security

OphirPay is designed with defense-in-depth across the contract, API, and web layers. No private keys are ever stored server-side — all signing happens client-side via Freighter/xBull/Rabet/Albedo/Lobstr.

### Smart Contract Invariants

- **Fund-safety invariant** — `emergency_withdraw` is capped at `contract_balance − LOCKED_BALANCE`, so even the contract **owner cannot drain** funds locked in active escrows, streams, or governance deposits
- **Reentrancy guard** — `REENTRANCY_LOCK` blocks cross-contract reentrancy on `emergency_withdraw` / `emergency_pause_all` / `emergency_unpause_all`
- **Pause circuit breaker** — `require_not_paused()` guards every state-changing function
- **Timelocked upgrades & ownership** — 24h delay on WASM upgrades and two-step ownership transfer (other admin actions are *not* timelocked on-chain — see [docs/AUDIT.md](docs/AUDIT.md))
- **1 address = 1 vote** — governance votes are tracked per-address on-chain; double-voting returns `AlreadyVoted`
- **Spam-resistant governance** — proposals require a minimum deposit (locked in `LOCKED_BALANCE`, refunded on execution)
- **No panics** — contract functions return `Result<T, PaymentError>` (the enum defines ~300 variants, many reserved for unimplemented features — see [docs/AUDIT.md](docs/AUDIT.md))
- **TTL management** — every write calls `extend_ttl(5000, 50000)` so records can never be archived

### Web & API Hardening

- **CSRF protection** — double-submit cookie pattern (`__Host-csrf`, HttpOnly, SameSite=Strict) with timing-safe comparison; the client mints the token once and retries once on `CSRF_INVALID`
- **Session security** — HMAC-SHA256 signed session cookies with expiry, `HttpOnly; SameSite=Lax`, fail-closed on DB errors
- **API keys** — SHA-256 hashed at rest, indexed prefix lookup, expiry support, `lastUsed` tracking
- **SSRF guard for webhooks** — blocks loopback/link-local/private IPs and hostnames, with DNS-rebinding re-validation at delivery time
- **HMAC-signed webhook payloads** — receivers verify `X-OphirPay-Signature` (HMAC-SHA256)
- **Input validation** — Zod schemas on all mutation routes; Stellar address regex, amount bounds, memo length limits
- **Rate limiting** — per-IP sliding window (120 RPM default, Redis backend for multi-instance)
- **Security headers** — CSP with Stellar-only connect-src, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Referrer-Policy
- **Error boundaries** — React error boundaries prevent full-page crashes
- **Secrets scanning** — Gitleaks on every PR; dependency auditing via `npm audit` in CI

> ⚠️ **Production note**: OphirPay uses SQLite locally. For production, migrate to PostgreSQL and set `AUTH_SECRET` (32+ bytes), `REDIS_URL` for distributed rate limiting, and the documented CORS origins. See `docs/deployment-mainnet.md` for the full checklist.

---

## ⚡ Performance & Gas

OphirPay is engineered for predictable on-chain costs and fast reads:

- **Gas-report CI gate** — the `contract-gas-report` job compiles both contracts, enforces the 128 KB Soroban WASM protocol limit, estimates base inclusion fees, and uploads a per-function gas report as a build artifact (`docs/GAS.md` mirrors the cost model)
- **Cached on-chain reads** — read-only simulations are cached server-side (30–60 s TTL) with per-key granularity; governance/multisig/escrow listings hit the RPC once per window instead of per request
- **Bounded N+1 enumeration** — list endpoints cap per-record reads (e.g. 100 proposals), enumerate the *most recent* tail first, and return an explicit `truncated` flag instead of silently dropping data
- **Scoped cache invalidation** — mutations invalidate only the affected query keys, so an on-chain write never triggers a full re-enumeration of unrelated (expensive) lists
- **RPC failover** — the RPC layer retries across endpoints and falls back between public providers to stay available during provider outages

### Audit-Readiness

- **~300 typed contract error variants** — every failure path returns a machine-readable `PaymentError` (many variants reserved for unimplemented features), mirrored in the TypeScript error catalog and surfaced as clean HTTP/API errors
- **Invariant tests** — fund-safety (`LOCKED_BALANCE` cap), reentrancy, pause, timelock, and 1-vote-per-address are covered by Rust unit tests (58 in `ophirpay`, 6 in `emitter`) plus 800 app vitest cases
- **Zero failing tests** — the full suite is green in CI (`lint`, `typecheck`, `unit-tests`, `contract-wasm`, `next-build`, `e2e`, `secret-scan`)
- **Threat-modeled web layer** — CSRF, SSRF, HMAC sessions, hashed API keys, rate limiting, and CSP are documented in the Security section above and enforced in code
- **Manual security review completed** — a full review of both Soroban contracts and the web/API security layer is in [docs/AUDIT.md](docs/AUDIT.md) (2 High, 6 Medium findings); a third-party audit is still pending before mainnet

---

## 🌐 Community

| Channel | Link |
|---|---|
| **GitHub Discussions** | [github.com/OphirPay/OphirPay/discussions](https://github.com/OphirPay/OphirPay/discussions) |
| **Issue Tracker** | [github.com/OphirPay/OphirPay/issues](https://github.com/OphirPay/OphirPay/issues) |
| **Security Reports** | [SECURITY.md](SECURITY.md) — Bug bounty program available |
| **Stellar Ecosystem** | [stellar.org](https://stellar.org) · [Soroban Docs](https://soroban.stellar.org) |

## 📄 License & Credits

### License

Open source under the **[MIT License](LICENSE)** — free for personal, commercial, and educational use.

### Built With

- [Stellar](https://stellar.org) & [Soroban](https://soroban.stellar.org) — The blockchain that powers it all
- [Next.js](https://nextjs.org) — The React framework for production
- [Tailwind CSS](https://tailwindcss.com) — Rapidly build modern websites
- [Prisma](https://prisma.io) — Next-generation ORM for Node.js
- [Vitest](https://vitest.dev) — Blazing fast unit test framework
- [Freighter](https://freighter.app) — Stellar wallet browser extension

### Acknowledgments

Special thanks to the **Stellar Development Foundation** for their excellent documentation, SDKs, and the Soroban smart contract platform that makes on-chain payment logic possible.

---

<div align="center">

**[🐛 Report a Bug](https://github.com/OphirPay/OphirPay/issues)** · **[💡 Request a Feature](https://github.com/OphirPay/OphirPay/issues)** · **[📖 Read the Docs](https://github.com/OphirPay/OphirPay#readme)**

<br />

<sub>Built with ❤️ for the Stellar ecosystem</sub>

</div>
