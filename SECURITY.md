# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OphirPay, please **do not** open a public issue.

Instead, email **security@ophirpay.com** with:
- A description of the vulnerability
- Steps to reproduce
- Affected versions
- Any potential mitigations

We will respond within 48 hours and work with you on a fix.

## CSRF Protection Policy

OphirPay implements CSRF (Cross-Site Request Forgery) protection using the
**double-submit cookie pattern**. This section documents the policy and
implementation details.

### Policy

All state-changing API routes (`POST`, `PATCH`, `DELETE`, `PUT`) **must**
implement CSRF protection. Read-only routes (`GET`, `HEAD`, `OPTIONS`) are
exempt as they do not modify state.

### Implementation

1. **Token Generation**: Clients request a CSRF token from `GET /api/csrf`.
   The server generates a cryptographically secure random token (256 bits),
   sets it as an `HttpOnly` cookie, and returns the token in the response body.

2. **Token Storage**: The client stores the token in memory (not localStorage
   or sessionStorage) and sends it as the `x-csrf-token` header on all
   mutating requests.

3. **Token Validation**: On mutating requests, the server compares the
   `x-csrf-token` header against the CSRF cookie value using constant-time
   comparison to prevent timing attacks.

4. **Token Rotation**: Tokens are single-use per mint. Each call to
   `GET /api/csrf` invalidates the previous token and issues a new one.

### Cookie Security Attributes

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `HttpOnly` | `true` | Prevents JavaScript access (XSS protection) |
| `Secure` | `true` (production) | HTTPS only |
| `SameSite` | `Strict` | Prevents cross-site requests |
| `Path` | `/` | Applies to all routes |
| `Prefix` | `__Host-` (production) | Host-only, no domain override |

### Development vs Production

- **Production (HTTPS)**: Cookie named `__Host-csrf` with `Secure` attribute
- **Development (HTTP)**: Cookie named `csrf` without `Secure` attribute
  (browsers reject `__Host-` cookies without Secure on non-localhost HTTP)

### Route Protection Requirements

All route handlers must implement CSRF protection using one of these methods:

```typescript
// Method 1: Manual enforcement
import { verifyCsrf } from "@/lib/csrf";

export async function POST(request: Request) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;
  // ... handle request
}

// Method 2: Higher-order function wrapper
import { withCsrf } from "@/lib/csrf";

export const POST = withCsrf(async (request: Request) => {
  // ... handle request
});