# OphirPay — Gas Optimization & Benchmarking

## Overview

OphirPay's Soroban contracts are optimized for **ultra-low gas fees** through:

1. **Individual counter keys** instead of a monolithic `ContractStats` struct (40% storage write savings)
2. **Paginated version histories** capped at 100 entries (prevents unbounded O(n) reads)
3. **Deduplicated owner checks** via `require_owner()` helper (reduces Wasm code size)
4. **Zero-initialization design** — counters default to 0 on first read, no deployment writes needed
5. **Zero-storage utility functions** — `calculate_fee()` is pure computation, no storage access

---

## Soroban Gas Model

Soroban uses a **resource-fee model** with three cost tiers:

| Resource | Relative Cost | Example |
|---|---|---|
| **Storage Write** (persistent) | $$$ | Storing a payment record (~300 bytes) |
| **Storage Write** (instance) | $$ | Incrementing a counter (16 bytes) |
| **Storage Read** (persistent) | $$ | Fetching a payment by ID (~300 bytes) |
| **Storage Read** (instance) | $ | Reading a counter (16 bytes) |
| **Event Emission** | $$ | Publishing a payment event |
| **Cross-contract Call** | $$$$$ | Pausing the Emitter from OphirPay |
| **CPU (Wasm)** | $ | Arithmetic, comparisons, string ops |

---

## Per-Operation Gas Benchmarks

Estimates based on Soroban v22 resource model (~100 gas/byte write, ~50 gas/byte read, ~30K gas/cross-contract call, ~2K gas/event).

### OphirPay Contract

| Operation | Storage Writes | Storage Reads | Events | Est. Gas | Optimized vs Baseline |
|---|---|---|---|---|---|
| `init` | 2 instance | 1 instance | 0 | ~3,000 | **-60%** (was 8 writes for counter pre-init) |
| `record_payment` | 1 persistent + 2 instance | 1 instance | 1 | ~12,000 | **-35%** (was ContractStats monolith read/write) |
| `create_escrow` | 1 persistent + 2 instance | 1 instance | 1 | ~14,000 | **-35%** |
| `create_stream` | 1 persistent + 2 instance | 1 instance | 1 | ~14,000 | **-35%** |
| `create_batch` (10 items) | 10 persistent + 3 instance | 1 instance | 1 | ~80,000 | **-33%** |
| `atomic_spend` | 1 persistent + 2 instance | 2 persistent + 1 instance | 1 | ~35,000 | **-35%** |
| `approve_payment` | 1 persistent | 2 persistent + 1 instance | 1 | ~22,000 | N/A |
| `vote_on_proposal` | 1 persistent | 1 persistent | 1 | ~18,000 | N/A |
| `request_refund` | 1 persistent + 1 instance | 1 instance | 1 | ~25,000 | **-35%** |
| `get_payment` | 0 | 1 persistent | 0 | ~500 | N/A (read-only, already minimal) |
| `get_stats` | 0 | 11 instance | 0 | ~1,500 | N/A (on-demand, reads individual counters) |
| `calculate_fee` | 0 | 0 | 0 | ~100 | N/A (pure computation) |

### Emitter Contract

| Operation | Storage Writes | Storage Reads | Events | Est. Gas |
|---|---|---|---|---|
| `init` | 2 instance | 1 instance | 0 | ~3,000 |
| `emit_payment` | 1 persistent + 1 instance | 1 instance | 1 | ~10,000 |
| `get_event` | 0 | 1 persistent | 0 | ~500 |
| `pause` / `unpause` | 1 instance | 1 instance | 0 | ~2,000 |

### Cross-Contract Operations

| Operation | Est. Gas (combined) | Note |
|---|---|---|
| `emergency_pause_all` | ~50,000–80,000 | Includes cross-contract call (~30K). Higher cost justified by **atomicity guarantee** — both contracts pause in one transaction. No partial-pause attack possible. |
| `emergency_unpause_all` | ~50,000–80,000 | Same atomicity guarantee. |

---

## Optimization Design Rationale

### 1. Individual Counters vs `ContractStats` Monolith

**Before:**
```rust
// Every counter increment: read 11-field struct (~200 bytes), modify 1 field, write back all 11
fn inc_stat_u64(env, get, set) {
    let mut stats: ContractStats = env.storage().instance().get(&STATS).unwrap_or(...);
    set(&mut stats, get(&stats).saturating_add(1));
    env.storage().instance().set(&STATS, &stats); // ~200 bytes written
}
```

**After:**
```rust
// Single-key read+write: 16 bytes each direction
fn inc_counter(env, key) {
    let val: u64 = env.storage().instance().get(key).unwrap_or(0);
    env.storage().instance().set(key, &val.saturating_add(1)); // 16 bytes written
}
```

**Savings:** 200 bytes → 16 bytes per write = **~92% reduction in storage write bytes**.

### 2. Paginated Version History

Both `get_multisig_config_history()` and `get_fee_config_history()` are capped at 100 entries (most recent first). Without this cap, a contract with 10,000 config changes would require 10,000 persistent storage reads (~500,000 gas) — effectively a DoS vector.

Single-version lookup (`get_fee_config_at_version(version)`) is still available for arbitrary version access.

### 3. Zero-Init Design

Soroban instance storage returns `None` for unset keys. Our counters default to 0 on first `.unwrap_or(0)`, so `init()` doesn't waste gas pre-writing zero values. This saves 4+ instance writes (~2,000 gas) on contract deployment.

### 4. Cross-Contract Pause Tradeoff

`emergency_pause_all()` makes a cross-contract call to the Emitter (~30K gas). This is the most expensive single operation but is **intentional**:

- **Security:** Atomicity prevents an attacker from pausing only one contract
- **Frequency:** Emergency pause is a rare admin action, not a hot-path operation
- **Alternative:** Without cross-contract pause, an attacker could pause OphirPay but leave the Emitter running, causing event loss

**Tradeoff accepted: higher one-time cost for critical security guarantee.**

---

## Future Optimizations (Not Yet Implemented)

| Optimization | Est. Savings | Priority | Effort |
|---|---|---|---|
| TTL batching per function | 15–20% per op | Medium | Low |
| Audit action names as `Symbol` instead of `String` | ~2K CPU/audit | Low | Medium |
| Reduce event payload sizes | ~1K/event | Low | Low |
| Lazy audit (event-only, skip persistent storage) | ~5K/audit (optional) | Low | High |

---

## Running Benchmarks

To benchmark actual gas usage on Stellar Testnet:

```bash
# Deploy contracts
./scripts/deploy-workflow.sh <SECRET_KEY> <OWNER_KEY> <EMITTER_ID>

# Call record_payment and check the TX fee
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <SECRET_KEY> \
  --network testnet \
  -- record_payment \
  --payer <ADDR> --payee <ADDR> --amount 1000 \
  --asset native --tx-hash test

# The transaction receipt will show the actual resource fee in stroops
```

> **Note:** Actual mainnet gas costs depend on network congestion and Soroban's dynamic fee model. These estimates are based on the static resource pricing model and should be validated against real testnet/mainnet transactions.
