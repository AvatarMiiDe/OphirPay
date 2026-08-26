# OphirPay API Cookbook

> curl examples and sample responses for every public endpoint.
> Base URL: `https://api.ophirpay.com` (production) or `http://localhost:3000` (dev)

## Authentication

Two modes supported:

```bash
# Recommended: Bearer token
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.ophirpay.com/api/health

# Alternative: Header
curl -H "X-API-Key: YOUR_API_KEY" https://api.ophirpay.com/api/health
```

API keys are generated via `POST /api/keys` and shown only once at creation.

---

## Payments

### List payments

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/payments?page=1&limit=20"
```

```json
{
  "data": [
    {
      "id": "pay_8f3k2m9x",
      "from": "GCIPHER...WALLET",
      "to": "GDESTINATION...ADDR",
      "amount": "100.0000000",
      "asset": "USDC",
      "status": "completed",
      "memo": "Invoice #1042",
      "createdAt": "2026-08-26T14:30:00Z",
      "txHash": "abc123...def456"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 142 }
}
```

### Create a payment

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "GDESTINATION...ADDR",
    "amount": "50.0000000",
    "asset": "USDC",
    "memo": "Payment for services"
  }' \
  https://api.ophirpay.com/api/payments
```

```json
{
  "id": "pay_9x4m7k2p",
  "to": "GDESTINATION...ADDR",
  "amount": "50.0000000",
  "asset": "USDC",
  "status": "pending",
  "createdAt": "2026-08-26T15:00:00Z"
}
```

### Get a payment by ID

```bash
curl -H "Authorization: Bearer $KEY" \
  https://api.ophirpay.com/api/payments/pay_8f3k2m9x
```

```json
{
  "id": "pay_8f3k2m9x",
  "from": "GCIPHER...WALLET",
  "to": "GDESTINATION...ADDR",
  "amount": "100.0000000",
  "asset": "USDC",
  "status": "completed",
  "memo": "Invoice #1042",
  "createdAt": "2026-08-26T14:30:00Z",
  "completedAt": "2026-08-26T14:30:05Z",
  "txHash": "abc123...def456"
}
```

### Update payment status or metadata

```bash
curl -X PATCH -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "cancelled", "metadata": {"reason": "duplicate"}}' \
  https://api.ophirpay.com/api/payments/pay_8f3k2m9x
```

```json
{
  "id": "pay_8f3k2m9x",
  "status": "cancelled",
  "metadata": {"reason": "duplicate"},
  "updatedAt": "2026-08-26T15:10:00Z"
}
```

### Delete a payment

```bash
curl -X DELETE -H "Authorization: Bearer $KEY" \
  https://api.ophirpay.com/api/payments/pay_8f3k2m9x
```

```json
{ "deleted": true, "id": "pay_8f3k2m9x" }
```

---

## Batches

### List batches

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/batches?page=1&limit=10"
```

```json
{
  "data": [
    {
      "id": "bat_7m3k9x2p",
      "status": "completed",
      "paymentCount": 25,
      "totalAmount": "12500.0000000",
      "asset": "USDC",
      "createdAt": "2026-08-25T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 8 }
}
```

### Create a batch payment

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "payments": [
      {"to": "GADDR1...AAA", "amount": "100.0000000"},
      {"to": "GADDR2...BBB", "amount": "200.0000000"},
      {"to": "GADDR3...CCC", "amount": "150.0000000"}
    ],
    "asset": "USDC",
    "memo": "August payroll batch"
  }' \
  https://api.ophirpay.com/api/batches
```

```json
{
  "id": "bat_4p8m2k7x",
  "status": "pending",
  "paymentCount": 3,
  "totalAmount": "450.0000000",
  "asset": "USDC",
  "createdAt": "2026-08-26T15:15:00Z"
}
```

### Get a batch with child payments

```bash
curl -H "Authorization: Bearer $KEY" \
  https://api.ophirpay.com/api/batches/bat_7m3k9x2p
```

```json
{
  "id": "bat_7m3k9x2p",
  "status": "completed",
  "totalAmount": "12500.0000000",
  "asset": "USDC",
  "createdAt": "2026-08-25T10:00:00Z",
  "payments": [
    {"id": "pay_1", "to": "GADDR1...AAA", "amount": "500.0000000", "status": "completed"},
    {"id": "pay_2", "to": "GADDR2...BBB", "amount": "500.0000000", "status": "completed"}
  ]
}
```

---

## Recurring Payments

### List recurring payments

```bash
curl -H "Authorization: Bearer $KEY" \
  https://api.ophirpay.com/api/recurring
```

```json
{
  "data": [
    {
      "id": "rec_3k7m9x2p",
      "to": "GDESTINATION...ADDR",
      "amount": "25.0000000",
      "asset": "USDC",
      "interval": "monthly",
      "nextExecution": "2026-09-01T00:00:00Z",
      "status": "active"
    }
  ]
}
```

### Create a recurring payment

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "GDESTINATION...ADDR",
    "amount": "25.0000000",
    "asset": "USDC",
    "interval": "monthly",
    "memo": "Monthly subscription"
  }' \
  https://api.ophirpay.com/api/recurring
```

```json
{
  "id": "rec_8x4m2k7p",
  "to": "GDESTINATION...ADDR",
  "amount": "25.0000000",
  "asset": "USDC",
  "interval": "monthly",
  "status": "active",
  "nextExecution": "2026-09-26T00:00:00Z",
  "createdAt": "2026-08-26T15:20:00Z"
}
```

### Get a recurring payment

```bash
curl -H "Authorization: Bearer $KEY" \
  https://api.ophirpay.com/api/recurring/rec_3k7m9x2p
```

```json
{
  "id": "rec_3k7m9x2p",
  "to": "GDESTINATION...ADDR",
  "amount": "25.0000000",
  "asset": "USDC",
  "interval": "monthly",
  "status": "active",
  "nextExecution": "2026-09-01T00:00:00Z",
  "executions": [
    {"id": "pay_1", "executedAt": "2026-08-01T00:00:05Z", "status": "completed"},
    {"id": "pay_2", "executedAt": "2026-07-01T00:00:03Z", "status": "completed"}
  ]
}
```

---

## Payment Requests

### List payment requests

```bash
curl -H "Authorization: Bearer $KEY" \
  https://api.ophirpay.com/api/requests
```

```json
{
  "data": [
    {
      "id": "req_5m8k3x2p",
      "amount": "75.0000000",
      "asset": "USDC",
      "description": "Consulting session",
      "status": "pending",
      "paymentLink": "https://ophirpay.com/pay/req_5m8k3x2p",
      "createdAt": "2026-08-26T12:00:00Z"
    }
  ]
}
```

### Create a payment request

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "75.0000000",
    "asset": "USDC",
    "description": "Consulting session - August 2026"
  }' \
  https://api.ophirpay.com/api/requests
```

```json
{
  "id": "req_9x7m4k2p",
  "amount": "75.0000000",
  "asset": "USDC",
  "description": "Consulting session - August 2026",
  "status": "pending",
  "paymentLink": "https://ophirpay.com/pay/req_9x7m4k2p",
  "createdAt": "2026-08-26T15:25:00Z"
}
```

---

## Webhooks

### List webhooks

```bash
curl -H "Authorization: Bearer $KEY" \
  https://api.ophirpay.com/api/webhooks
```

```json
{
  "data": [
    {
      "id": "wh_2k8m5x3p",
      "url": "https://myapp.com/webhooks/ophirpay",
      "events": ["payment.completed", "payment.failed"],
      "active": true,
      "createdAt": "2026-08-20T09:00:00Z"
    }
  ]
}
```

### Register a webhook

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://myapp.com/webhooks/ophirpay",
    "events": ["payment.completed", "payment.failed", "batch.completed"]
  }' \
  https://api.ophirpay.com/api/webhooks
```

```json
{
  "id": "wh_7p3m9x2k",
  "url": "https://myapp.com/webhooks/ophirpay",
  "events": ["payment.completed", "payment.failed", "batch.completed"],
  "secret": "whsec_abc123...xyz789",
  "active": true,
  "createdAt": "2026-08-26T15:30:00Z"
}
```

> ⚠️ The `secret` is shown only once. Store it securely for HMAC signature verification.

### Delete a webhook

```bash
curl -X DELETE -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "wh_2k8m5x3p"}' \
  https://api.ophirpay.com/api/webhooks
```

```json
{ "deleted": true, "id": "wh_2k8m5x3p" }
```

---

## API Keys

### List API keys

```bash
curl -H "Authorization: Bearer $KEY" \
  https://api.ophirpay.com/api/keys
```

```json
{
  "data": [
    {
      "id": "key_4m7k2x9p",
      "name": "Production",
      "hashPrefix": "a3f8...",
      "createdAt": "2026-08-01T10:00:00Z",
      "lastUsedAt": "2026-08-26T14:30:00Z"
    }
  ]
}
```

### Generate a new API key

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "CI/CD Pipeline"}' \
  https://api.ophirpay.com/api/keys
```

```json
{
  "id": "key_8x2m5k7p",
  "name": "CI/CD Pipeline",
  "key": "oph_live_abc123...xyz789",
  "createdAt": "2026-08-26T15:35:00Z"
}
```

> ⚠️ The raw `key` is shown only once. Store it securely.

### Revoke an API key

```bash
curl -X DELETE -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "key_4m7k2x9p"}' \
  https://api.ophirpay.com/api/keys
```

```json
{ "deleted": true, "id": "key_4m7k2x9p" }
```

---

## Authentication / Session

### Issue a session cookie

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "GCIPHER...WALLET"}' \
  https://api.ophirpay.com/api/auth/session
```

```json
{
  "sessionToken": "sess_abc123...xyz789",
  "walletAddress": "GCIPHER...WALLET",
  "expiresAt": "2026-08-27T15:40:00Z"
}
```

### Revoke session cookie

```bash
curl -X DELETE -H "Authorization: Bearer