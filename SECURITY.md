# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OphirPay, please **do not** open a public issue.

Instead, email **security@ophirpay.com** with:
- A description of the vulnerability
- Steps to reproduce
- Affected versions
- Any potential mitigations

We will respond within 48 hours and work with you on a fix.

## Security Best Practices

### For Users
- OphirPay never stores private keys — all signing happens client-side via Freighter
- Always verify the destination address before signing
- Check transaction details in Freighter before approving
- Use a hardware wallet for production/mainnet operations

### For Developers
- Run `npm audit` regularly to check for dependency vulnerabilities
- Keep all dependencies up to date
- Review PRs for security implications
- Never commit secrets or API keys
- Use environment variables for all sensitive configuration

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | ✅ Active          |

## Security Headers

OphirPay implements the following security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 0`

## Smart Contract Security

- All contract functions use proper access control
- Cross-contract calls are validated
- Contracts use Result types for error handling
- Timestamps and metadata are recorded for audit trails
