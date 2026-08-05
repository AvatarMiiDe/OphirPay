# Contributing to OphirPay

Thank you for your interest in contributing! OphirPay is an open-source payment orchestration layer for Stellar.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/OphirPay.git`
3. Install dependencies: `npm install`
4. Set up the database: `npx prisma db push && npx prisma generate`
5. Start the dev server: `npm run dev`

## Development Workflow

- **Branch naming**: `feat/feature-name`, `fix/bug-description`, `docs/what-changed`
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org)
- **Before submitting**: Run `npm run ci` (typecheck → lint → test → build)

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run typecheck     # TypeScript check
npm run lint          # ESLint
```

## Smart Contracts

Contracts are in `contracts/`. Build with:

```bash
cd contracts/ophirpay && cargo test
cd contracts/emitter && cargo test
```

## Pull Request Process

1. Ensure all tests pass and lint is clean
2. Update documentation if needed
3. Add a changelog entry
4. Request review from a maintainer

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
