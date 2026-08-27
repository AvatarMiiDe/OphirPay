# Security Policy

OphirPay takes the security of its users, funds, and infrastructure seriously.
This policy explains how to report a vulnerability, what to expect after you
report, what is in scope, and the safe-harbor protections for researchers who
follow it.

## Reporting a Vulnerability

If you discover a security vulnerability in OphirPay, **do not** open a public
issue, public pull request, discussion, or social post with sensitive details.

Please report it through one of the private channels below.

### How to report

1. **Private email (fastest)**
   Send your report to **security@ophirpay.com**. Include the details listed
   in [What to include](#what-to-include-in-your-report).

2. **PGP-encrypted email (preferred for sensitive reports)**
   Encrypt the full report with the security team's public key before sending
   it to **security@ophirpay.com**. If you need the current key fingerprint,
   request it over an out-of-band channel (for example the project's
   [SUPPORT.md](.github/SUPPORT.md) or the GitHub organization profile), and
   verify the fingerprint before use.

3. **GitHub private vulnerability reporting**
   If the repository has private vulnerability reporting enabled, use the
   **"Report a vulnerability"** button on the
   [Security tab](https://github.com/OphirPay/OphirPay/security/advisories)
   and fill in the
   [Security Vulnerability template](.github/ISSUE_TEMPLATE/security_vulnerability.yml).
   Reports submitted this way are visible only to repository maintainers.

> Never send secrets, private keys, or real user data in a report. Redact
> sensitive material and describe it in placeholders instead.

### What to include in your report

The more complete the report, the faster we can triage it:

- A concise summary of the vulnerability
- Affected component and file paths (e.g. `contracts/ophirpay/src/lib.rs`,
  `src/app/api/**/route.ts`)
- Version, release tag, or commit hash where the issue reproduces
- Environment details: network (TESTNET / PUBLIC), chain/network ID, browser
  and version, OS
- Step-by-step reproduction instructions
- Expected behavior vs. observed behavior
- Security impact: what an attacker can do, and the likely blast radius
- Any logs, screenshots, transaction hashes, addresses, or calldata needed to
  reproduce
- For smart contract issues: contract name, on-chain address, and the
  function(s) involved
- A suggested mitigation, if you have one

### Response expectations

| Stage | Timeframe |
|---|---|
| Acknowledgement of your report | Within **48 hours** |
| Initial triage and severity assessment | Within **5 business days** |
| Fix target — Critical / High | As soon as possible, coordinated with you |
| Fix target — Medium / Low | Next planned release, coordinated with you |
| Advisory publication | After the fix ships, credited to you (if you consent) |

If you do not hear back within the acknowledgement window, please follow up on
the same thread or escalate via [SUPPORT.md](.github/SUPPORT.md).

## Supported Versions

Security fixes are backported to supported release lines:

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅ Active (current — incl. `v1.0.0-rc1` release candidates) |
| 0.1.x   | ⚠️ Security patches only |

Only the latest release of each supported line receives security fixes.
Older versions are not patched; please upgrade. When reporting, state which
version you found the issue in and whether it reproduces on the latest
release.

## Scope

### In scope

- **Smart contracts**: `contracts/ophirpay/src/lib.rs`,
  `contracts/emitter/src/lib.rs` (and the `contracts/` tree generally)
- **API routes**: `src/app/api/**/route.ts`
- **Authentication**: wallet session auth, API key auth, CSRF handling
- **Webhook system**: URL validation, HMAC signing, SSRF prevention
- **Frontend**: client-side signing flows, wallet integration (Freighter,
  xBull, Rabet, Albedo, Lobstr, Ledger), demo mode
- **Infrastructure**: Dockerfile, Kubernetes manifests, Helm chart, GitHub
  Actions workflows, deployment scripts

### Out of scope

- Third-party services we do not control (Vercel, Neon/PostgreSQL, the Stellar
  network, Horizon/Soroban RPC endpoints)
- Vulnerabilities in upstream dependencies — report them to the dependency's
  maintainers (Dependabot / `npm audit` also surface these)
- Issues that require physical access to a device or social engineering of a
  user
- Known issues already documented in [docs/AUDIT.md](docs/AUDIT.md)
- Best-practice suggestions with no demonstrated vulnerability — please open a
  regular [feature request](.github/ISSUE_TEMPLATE/feature_request.yml) instead

If you are unsure whether something is in scope, report it anyway — we prefer
an out-of-scope report to a missed one.

## Safe Harbor

We will not pursue civil or criminal legal action, and will not report you to
law enforcement or your employer, for security research conducted in good
faith that complies with this policy, including:

- Research performed on your own OphirPay deployment, the testnet contracts,
  or the public instance **without** exceeding the limits below
- Testing that does not access, modify, or delete other users' data
- Testing that does not disrupt the availability of the service
- Reporting the vulnerability privately and giving us a reasonable
  opportunity to fix it before any public disclosure
- Not exploiting a vulnerability beyond what is necessary to demonstrate it

If legal action is initiated by a third party against you for research that
followed this policy, we will consider making a public statement in your
support.

## Security Best Practices

### For Users

- OphirPay never stores private keys — all signing happens client-side via
  Freighter
- Always verify the destination address before signing
- Check transaction details in Freighter before approving
- Use a hardware wallet for production/mainnet operations

### For Developers

- Run `npm audit` regularly to check for dependency vulnerabilities
- Keep all dependencies up to date
- Review PRs for security implications
- Never commit secrets or API keys
- Use environment variables for all sensitive configuration
- Follow the contract security guidance below for any contract change

## Bug Bounty Program

OphirPay offers rewards for responsibly disclosed vulnerabilities:

| Severity | Reward | Examples |
|---|---|---|
| **Critical** (9.0-10.0) | Up to $5,000 | Fund drainage, unauthorized admin takeover, key extraction |
| **High** (7.0-8.9) | Up to $2,000 | Reentrancy, signature bypass, privilege escalation |
| **Medium** (4.0-6.9) | Up to $500 | CSRF on sensitive endpoints, information disclosure, DoS |
| **Low** (0.1-3.9) | Swag + recognition | Minor issues, defense-in-depth improvements |

### Rules

1. **Do not** exploit the vulnerability beyond what is necessary to demonstrate it
2. **Do not** access, modify, or delete other users' data
3. **Do not** disrupt the live service (ophirpay.vercel.app)
4. **Do not** disclose the vulnerability publicly before it is resolved
5. Provide a clear proof-of-concept with steps to reproduce

### Process

1. Report via one of the [private channels](#how-to-report) above
2. We acknowledge within 48 hours
3. We validate and determine severity within 5 business days
4. We ship a fix and publish an advisory
5. You receive credit in the advisory + reward (with your consent)

> Payouts are in XLM or USDC on Stellar. We follow
> [CVSS v3.1](https://www.first.org/cvss/v3.1/specification-document) scoring.

## Security Headers

OphirPay implements the following security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 0`

## Smart Contract Security

- All contract functions use proper access control
- Cross-contract calls are validated and propagate failures atomically (see
  [docs/CONTRACT_ARCHITECTURE.md](docs/CONTRACT_ARCHITECTURE.md))
- Contracts use Result types for error handling
- Timestamps and metadata are recorded for audit trails
- Sensitive operations are protected by reentrancy locks, two-step ownership
  transfer (24h timelock), and timelocked upgrades
