# OphirPay Architecture

## System Overview

OphirPay is a payment orchestration layer built on the Stellar blockchain. It consists of three layers:

```
┌─────────────────────────────────────────────────┐
│                  Frontend (Next.js)              │
│  15 pages · Freighter wallet · SSE streaming     │
├─────────────────────────────────────────────────┤
│              API Layer (Next.js Routes)          │
│  CRUD · Webhooks · Analytics · Auth · Rate Limit │
├─────────────────────────────────────────────────┤
│         Soroban Smart Contracts (Rust)           │
│  OphirPayContract · PaymentEventEmitter          │
└─────────────────────────────────────────────────┘
```

## Component Diagram

### 1. Smart Contracts

| Contract | Purpose | Key Functions |
|---|---|---|
| **OphirPayContract** | Core payment logic | `record_payment`, `create_escrow`, `create_stream`, `create_batch`, `request_refund`, `propose_payment`, `create_proposal`, `emergency_pause_all` |
| **PaymentEventEmitter** | Event broadcasting | `emit_payment`, `pause`, `unpause` |

**Cross-contract communication**: OphirPayContract calls `env.invoke_contract()` on Emitter for `emergency_pause_all`/`emergency_unpause_all`, pausing both contracts atomically.

### 2. Data Flow

```
User Action → Freighter Signing → Soroban TX → OphirPayContract
                                                    │
                                          ┌─────────┴─────────┐
                                          │   Native Events    │
                                          │ env.events().publish│
                                          └─────────┬─────────┘
                                                    │
                                          ┌─────────┴─────────┐
                                          │   SSE Stream       │
                                          │ /api/events → UI   │
                                          └───────────────────┘
```

### 3. Storage Architecture

| Type | Location | TTL | Purpose |
|---|---|---|---|
| Instance storage | Contract instance | 50,000 ledgers | Counters, config, owner, paused flag |
| Persistent storage | Contract ledger | 50,000 ledgers per entry | Payments, escrows, streams, batches, audit entries |

All writes call `extend_ttl(5000, 50000)` to prevent archival.

### 4. Security Model

| Layer | Mechanism |
|---|---|
| **Pause circuit breaker** | `require_not_paused()` on every state-changing function |
| **Two-step upgrades** | 24h timelock via `propose_upgrade` → `execute_upgrade` |
| **Two-step ownership** | 24h timelock via `transfer_ownership` → `accept_ownership` |
| **Atomic check-and-spend** | `atomic_spend()` validates limits THEN records payment |
| **RBAC** | Admin/Operator/Auditor roles with `require_role()` |
| **Timelocked actions** | 24h delay on sensitive admin operations |
| **Emergency withdraw** | Owner-only rescue of misdirected tokens |

### 5. Error Handling

50 typed error codes from `NotInitialized=1` to `RefundWindowExpired=50`. Contract functions return `Result<T, PaymentError>` — no panics in production code.

## Directory Structure

```
ophirpay/
├── contracts/              # Soroban smart contracts (Rust)
│   ├── ophirpay/           # Core payment contract (3600+ lines)
│   └── emitter/            # Event emission contract
├── src/
│   ├── app/                # Next.js App Router pages (15 routes)
│   │   ├── api/            # API routes (20+ endpoints)
│   │   └── [page]/         # Page components
│   ├── components/         # Shared UI components
│   │   └── ui/             # Design system (Button, Card, Modal, etc.)
│   ├── hooks/              # React hooks (16 hooks)
│   ├── lib/                # Business logic (100+ modules)
│   └── types/              # TypeScript type definitions
├── prisma/                 # Database schema + seed
├── k8s/                    # Kubernetes manifests
├── helm/                   # Helm chart
├── scripts/                # Deployment, demo, relayer, seeding
├── e2e/                    # Playwright E2E tests
├── monitoring/             # Grafana dashboard JSON
└── docs/                   # Documentation
```

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Stellar / Soroban SDK 27.0.5 |
| Contracts | Rust, `#![no_std]`, soroban-sdk 27.0.5, wasm32v1-none target |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Database | PostgreSQL via Prisma ORM |
| Wallet | Freighter (Albedo, xBull, Ledger supported) |
| Testing | Vitest (184), Rust `#[test]` (62), Playwright (71 E2E+API) |
| CI/CD | GitHub Actions (13 jobs) |
| Orchestration | Kubernetes + Helm |
| Monitoring | Prometheus + Grafana |
