# Changelog

All notable changes to OphirPay will be documented in this file.

## [0.1.0] — 2026-08-05

### Added
- Wallet connect/disconnect with Freighter browser extension
- Send XLM payments on Stellar Testnet
- Batch payments (multi-recipient in single transaction)
- Soroban smart contract deployment (OphirPay + Emitter)
- Cross-contract communication between contracts
- SSE event streaming from on-chain events
- Mobile-responsive UI with dark mode toggle
- CI/CD pipeline with GitHub Actions
- Shared UI component library (Button, Card, Modal, Toast, Badge, etc.)
- Environment variable validation with Zod
- API rate limiting and CORS middleware
- CSV import/export for batch payments
- Webhook delivery with HMAC signing
- Analytics aggregation API
- Payment requests API
- Recurring payment schedules
- API key management
- Address book utility
- Browser notification support
- Feature flag system
- Audit trail logging
- Comprehensive input validation and sanitization

### Changed
- Contracts use Result types instead of panics
- Payment struct includes timestamp and metadata
- API responses use structured success/error format
- Sidebar uses shared Icon components

### Security
- Security headers on all responses
- Input sanitization against XSS
- SQL injection pattern detection
- API key hashing with SHA-256
- Timing-safe comparison for secrets
