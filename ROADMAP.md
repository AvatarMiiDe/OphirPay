# OphirPay Roadmap

## Q3 2026 (Current)

### In Progress / Done
- [x] Voting weight security fix (1 address = 1 vote)
- [x] Reentrancy guard on cross-contract calls
- [x] Minimum proposal deposit enforcement
- [x] Error code expansion (52 → 94)
- [x] React Query data fetching layer
- [x] Zod validation on API routes
- [x] CSRF protection for mutations
- [x] Docker distroless base image
- [x] 20-job CI/CD pipeline

### Up Next
- [ ] External security audit (Runtime Verification or Certora)
- [ ] Formal verification of key contract invariants
- [ ] Contract modularization (split into Payment/Escrow/Governance modules)
- [ ] Redis-backed distributed rate limiting
- [ ] Bug bounty program on Immunefi

## Q4 2026

- [ ] Mainnet deployment with $1M+ TVL target
- [ ] Token-weighted governance (governance token + snapshot system)
- [ ] Mobile wallet SDK (React Native)
- [ ] Fiat on-ramp integration (Kado, MoonPay)
- [ ] Cross-chain bridge support (Sep-38 anchors)
- [ ] Real-time WebSocket API (replace SSE polling)
- [ ] Automated market maker for fee distribution

## Q1 2027

- [ ] Layer-2 / state channel payments for high-frequency use cases
- [ ] Multi-party computation (MPC) wallet integration
- [ ] Regulatory compliance framework (Travel Rule, KYC/AML)
- [ ] Insurance fund for smart contract risk
- [ ] DAO transition (remove admin key, full on-chain governance)

## Long-term Vision

- **10M+ payments processed** on Stellar mainnet
- **Institutional-grade custody** via Fireblocks / Copper integration
- **Cross-chain payments** via Stellar anchors + IBC
- **ZK-proof audit trails** for privacy-preserving payment verification
- **Open-source grant program** for ecosystem contributors
