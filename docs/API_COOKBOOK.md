# OphirPay API Cookbook

> Complete curl examples and sample responses for all 59 API endpoints.
> Base URL: `https://api.ophirpay.com` (production) or `http://localhost:3000` (development)

## Authentication

All authenticated endpoints require one of these headers:

```bash
# Option 1: Bearer token (recommended)
curl -H "Authorization: Bearer ***" https://api.ophirpay.com/api/health

# Option 2: API Key header
curl -H "X-API-Key: ***" https://api.ophirpay.com/api/health
```

API keys are generated via `POST /api/keys` and shown only once at creation.

## API Keys

### List API keys (hashes hidden)

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/keys"
```

**Example response:**

```json
{}
```

### Generate a new API key (raw key shown once)

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Example Name",
  "userId": "abc123"
}' \
  https://api.ophirpay.com/api/keys
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "name": "Example Name",
    "prefix": "string",
    "key": "GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY"
  }
}
```

### Revoke an API key

```bash
curl -X DELETE -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  https://api.ophirpay.com/api/keys?id=example
```

**Example response:**

```json
{}
```

## Analytics

### Aggregated payment analytics

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/analytics"
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "totalPayments": 1,
    "completedPayments": 1,
    "failedPayments": 1,
    "totalVolume": 100.0,
    "averageAmount": 100.0,
    "successRate": 1,
    "volumeByDay": [
      {
        "date": {},
        "volume": {},
        "count": {}
      }
    ]
  }
}
```

## Audit Log

### Query contract audit log

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/audit-log?page=1&limit=20&actor=example"
```

**Example response:**

```json
{}
```

### Subscribe to the live audit-log stream

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/audit-log/sse"
```

**Example response:**

```json
{}
```

## Batches

### List batches with pagination

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/batches?page=1&limit=20&status=example"
```

**Example response:**

```json
{}
```

### Create a batch payment

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Example Name",
  "description": "Example description",
  "recipients": [
    {
      "address": "GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY",
      "amount": 100.0,
      "assetCode": "USDC",
      "memo": "Example description"
    }
  ],
  "sourceAccountId": "GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY"
}' \
  https://api.ophirpay.com/api/batches
```

**Example response:**

```json
{}
```

### Get a batch with its child payments

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/batches/abc123"
```

**Example response:**

```json
{}
```

## Contracts

### Get contract deployment info and version

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/contracts"
```

**Example response:**

```json
{}
```

## Escrows

### List escrows or fetch one by id

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/escrows?id=1"
```

**Example response:**

```json
{}
```

### Create an on-chain escrow

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "payee": "string",
  "amount": 100.0,
  "assetCode": "USDC",
  "releaseAfter": 1,
  "releaseTo": "string",
  "memo": "Example description"
}' \
  https://api.ophirpay.com/api/escrows
```

**Example response:**

```json
{}
```

### Get an escrow by id

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/escrows/abc123"
```

**Example response:**

```json
{}
```

## Events

### Subscribe to real-time payment events

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/events"
```

**Example response:**

```json
{}
```

### Fetch on-chain payment event history

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/events/history?limit=50"
```

**Example response:**

```json
{}
```

## Fee Config

### Get the current fee configuration

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/fee-config"
```

**Example response:**

```json
{}
```

### Get the fee collector address

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/fee-config/collector"
```

**Example response:**

```json
{}
```

### Get fee configuration version history

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/fee-config/history"
```

**Example response:**

```json
{}
```

## Governance

### Execute a passed proposal

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "proposalId": 1
}' \
  https://api.ophirpay.com/api/governance/execute
```

**Example response:**

```json
{}
```

### List governance proposals (most recent first)

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/governance/proposals"
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": {},
        "title": {},
        "description": {},
        "action_type": {},
        "yes_votes": {},
        "no_votes": {},
        "voting_ends_at": {},
        "executed": {},
        "proposer": {}
      }
    ],
    "total": 1,
    "truncated": true
  }
}
```

### Create a governance proposal (on-chain)

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "proposer": "string",
  "title": "string",
  "description": "Example description",
  "actionType": "string",
  "target": "string",
  "data": "string",
  "depositAsset": "USDC",
  "depositAmount": 1
}' \
  https://api.ophirpay.com/api/governance/proposals
```

**Example response:**

```json
{}
```

### Cast a vote on a proposal (on-chain, 1 vote per address)

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "proposalId": 1,
  "voter": "string",
  "support": true
}' \
  https://api.ophirpay.com/api/governance/vote
```

**Example response:**

```json
{}
```

## Health

### Service health check

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/health"
```

**Example response:**

```json
{}
```

## Hooks

### List notification hooks

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/hooks?event_type=example"
```

**Example response:**

```json
{}
```

### Persist a hook ledger row after an on-chain register_hook

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "eventType": "string",
  "webhookUrl": "https://example.com/webhook",
  "onChainId": 1
}' \
  https://api.ophirpay.com/api/hooks
```

**Example response:**

```json
{}
```

### Deactivate a hook ledger row after an on-chain unregister_hook

```bash
curl -X PATCH -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "active": true
}' \
  https://api.ophirpay.com/api/hooks/abc123
```

**Example response:**

```json
{}
```

## Metrics

### Prometheus metrics endpoint

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/metrics"
```

**Example response:**

```json
{}
```

## Multisig

### Get current multisig configuration

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/multisig"
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "threshold": 1,
    "signers": [
      "string"
    ],
    "enabled": true
  }
}
```

### Configure multisig (owner-only on-chain)

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "threshold": 1,
  "signers": [
    "string"
  ],
  "enabled": true
}' \
  https://api.ophirpay.com/api/multisig
```

**Example response:**

```json
{}
```

### Approve a pending multisig proposal

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "requestId": 1
}' \
  https://api.ophirpay.com/api/multisig/approve
```

**Example response:**

```json
{}
```

### Execute a fully approved multisig payment

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "requestId": 1
}' \
  https://api.ophirpay.com/api/multisig/execute
```

**Example response:**

```json
{}
```

### Propose a payment for multisig approval

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "payee": "string",
  "amount": 100.0,
  "assetCode": "USDC",
  "memo": "Example description"
}' \
  https://api.ophirpay.com/api/multisig/propose
```

**Example response:**

```json
{}
```

### List pending approval requests

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/multisig/requests"
```

**Example response:**

```json
{}
```

## Payment Requests

### List payment requests

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/requests"
```

**Example response:**

```json
{}
```

### Create a payment request / payment link

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "amount": 100.0,
  "assetCode": "USDC",
  "assetIssuer": "USDC",
  "description": "Example description",
  "recipientAddress": "GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY"
}' \
  https://api.ophirpay.com/api/requests
```

**Example response:**

```json
{}
```

## Payments

### List payments

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/payments?page=1&limit=20&status=example"
```

**Example response:**

```json
{
  "success": true,
  "data": [
    {
      "id": {},
      "amount": {},
      "assetCode": {},
      "assetIssuer": {},
      "description": {},
      "memo": {},
      "status": {},
      "transactionHash": {},
      "sourceAccountId": {},
      "userId": {},
      "batchId": {},
      "createdAt": {},
      "completedAt": {},
      "errorMessage": {}
    }
  ],
  "meta": {
    "page": 1,
    "limit": 1,
    "total": 1
  }
}
```

### Create a payment

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "amount": 100.0,
  "assetCode": "USDC",
  "assetIssuer": "USDC",
  "description": "Example description",
  "memo": "Example description",
  "sourceAccountId": "GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY",
  "destAddress": "GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY"
}' \
  https://api.ophirpay.com/api/payments
```

**Example response:**

```json
{
  "id": "abc123",
  "amount": 100.0,
  "assetCode": "USDC",
  "assetIssuer": null,
  "description": null,
  "memo": null,
  "status": "completed",
  "transactionHash": null,
  "sourceAccountId": "GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY",
  "userId": "abc123",
  "batchId": null,
  "createdAt": "2026-08-26T15:30:00Z",
  "completedAt": null,
  "errorMessage": null
}
```

### Get a payment by ID

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/payments/abc123"
```

**Example response:**

```json
{
  "id": "abc123",
  "amount": 100.0,
  "assetCode": "USDC",
  "assetIssuer": null,
  "description": null,
  "memo": null,
  "status": "completed",
  "transactionHash": null,
  "sourceAccountId": "GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY",
  "userId": "abc123",
  "batchId": null,
  "createdAt": "2026-08-26T15:30:00Z",
  "completedAt": null,
  "errorMessage": null
}
```

### Update payment status or metadata

```bash
curl -X PATCH -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "status": "CREATED",
  "description": "Example description",
  "memo": "Example description"
}' \
  https://api.ophirpay.com/api/payments/abc123
```

**Example response:**

```json
{}
```

### Delete a payment

```bash
curl -X DELETE -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  https://api.ophirpay.com/api/payments/abc123
```

**Example response:**

```json
{}
```

## Policy Versions

### Get fee and multisig config version history

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/policy-versions"
```

**Example response:**

```json
{}
```

## RBAC

### Look up role assignments

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/rbac?addr=example"
```

**Example response:**

```json
{}
```

## Recurring

### List recurring payments

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/recurring?page=1&limit=20"
```

**Example response:**

```json
{}
```

### Create a recurring payment

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Example Name",
  "frequency": "DAILY",
  "amount": 100.0,
  "assetCode": "USDC",
  "destAddress": "GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY",
  "description": "Example description",
  "sourceAccountId": "GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY"
}' \
  https://api.ophirpay.com/api/recurring
```

**Example response:**

```json
{}
```

### Get a recurring payment by id

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/recurring/abc123"
```

**Example response:**

```json
{}
```

## Refunds

### List refunds or refund analytics

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/refunds"
```

**Example response:**

```json
{}
```

### Persist a refund ledger row after an on-chain request_refund

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "paymentId": 1,
  "amount": 100.0,
  "asset": "USDC",
  "reason": "string",
  "reasonCode": 1,
  "onChainId": 1
}' \
  https://api.ophirpay.com/api/refunds
```

**Example response:**

```json
{}
```

### Update the lifecycle status of a refund ledger row

```bash
curl -X PATCH -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "status": "APPROVED"
}' \
  https://api.ophirpay.com/api/refunds/abc123
```

**Example response:**

```json
{}
```

## Session

### Issue a signed session cookie for a connected wallet

> **Note:** The session flow requires 3 steps:
> 1. Get a CSRF token from `/api/csrf`
> 2. Get a challenge from `/api/auth/challenge` and sign it with your wallet
> 3. Submit the signed challenge to `/api/auth/session`

**Step 1: Get CSRF token**

```bash
curl -c cookies.txt https://api.ophirpay.com/api/csrf
```

**Step 2: Get wallet challenge**

```bash
curl -H "Authorization: Bearer "   "https://api.ophirpay.com/api/auth/challenge?address=GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY"
```

**Example response:**

```json
{
  "challenge": "Please sign this message to prove ownership: abc123def456...",
  "expiresAt": "2026-08-26T16:00:00Z"
}
```

**Step 3: Submit signed challenge**

```bash
curl -X POST -H "Authorization: Bearer "   -H "Content-Type: application/json"   -H "X-CSRF-Token: "   -b cookies.txt   -d '{
    "publicKey": "GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY",
    "signature": "wallet_signed_challenge_signature_here"
  }'   https://api.ophirpay.com/api/auth/session
```

**Example response:**

```json
{
  "sessionToken": "sess_abc123def456",
  "walletAddress": "GA4AF6SGSYIS3JRQ6IR2XWLQGPYG52WEO53QRTEN5HD5ERF4256TNGJY",
  "expiresAt": "2026-08-27T23:10:00Z"
}
```

### Revoke the session cookie

```bash
curl -X DELETE -H "Authorization: Bearer "   -b cookies.txt   https://api.ophirpay.com/api/auth/session
```

**Response:** `204 No Content`


## Stats

### Aggregate on-chain contract statistics

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/stats"
```

**Example response:**

```json
{}
```

## Streams

### List streams or fetch one by id

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/streams?id=1"
```

**Example response:**

```json
{}
```

### Create an on-chain payment stream

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "payee": "string",
  "amount": 100.0,
  "assetCode": "USDC",
  "startTime": 1,
  "endTime": 1,
  "memo": "Example description"
}' \
  https://api.ophirpay.com/api/streams
```

**Example response:**

```json
{}
```

### Get a stream by id

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/streams/abc123"
```

**Example response:**

```json
{}
```

## Timelock

### List pending timelocked actions

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/timelock?id=1"
```

**Example response:**

```json
{}
```

## Webhooks

### List registered webhooks (secrets redacted)

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://api.ophirpay.com/api/webhooks"
```

**Example response:**

```json
{}
```

### Register a new webhook

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "url": "https://example.com/webhook",
  "events": [
    "payment.created"
  ],
  "isActive": true
}' \
  https://api.ophirpay.com/api/webhooks
```

**Example response:**

```json
{}
```

### Delete a webhook

```bash
curl -X DELETE -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  https://api.ophirpay.com/api/webhooks?id=example
```

**Example response:**

```json
{}
```
