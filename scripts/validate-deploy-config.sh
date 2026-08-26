#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Validate the deploy workflow's PUBLIC (mainnet) configuration.
# Ensures the deploy script:
#   1. Is syntactically valid bash
#   2. Targets the Stellar Mainnet RPC/Horizon/passphrase
#   3. Disables friendbot
#   4. Dry-run fails before any real submission
# ─────────────────────────────────────────────────────────────
set -euo pipefail

GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m"

SCRIPT="scripts/deploy-workflow.sh"

echo "── Validating deploy script syntax ──"
bash -n "$SCRIPT"
echo -e "${GREEN}  ✓ Syntax OK${NC}"

echo "── Validating PUBLIC network configuration ──"

# Verify the PUBLIC branch uses the mainnet RPC endpoint.
if ! grep -q 'https://soroban.stellar.org:443' "$SCRIPT"; then
  echo -e "${RED}  ✗ PUBLIC mode must use mainnet Soroban RPC (https://soroban.stellar.org:443)${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Mainnet RPC configured${NC}"

# Verify the PUBLIC branch uses the mainnet Horizon endpoint.
if ! grep -q 'https://horizon.stellar.org' "$SCRIPT"; then
  echo -e "${RED}  ✗ PUBLIC mode must use mainnet Horizon (https://horizon.stellar.org)${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Mainnet Horizon configured${NC}"

# Verify the PUBLIC branch uses the mainnet passphrase.
if ! grep -q 'Public Global Stellar Network ; September 2015' "$SCRIPT"; then
  echo -e "${RED}  ✗ PUBLIC mode must use the mainnet network passphrase${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Mainnet passphrase configured${NC}"

# Verify friendbot is disabled in PUBLIC mode.
if ! grep -q 'FRIENDBOT_ENABLED=false' "$SCRIPT"; then
  echo -e "${RED}  ✗ PUBLIC mode must disable friendbot${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Friendbot disabled in PUBLIC mode${NC}"

# Verify the dry-run guard exists and fails before submission.
if ! grep -q 'DRY_RUN' "$SCRIPT"; then
  echo -e "${RED}  ✗ Deploy script must support DRY_RUN mode${NC}"
  exit 1
fi
if ! grep -q 'refusing to submit any transaction to PUBLIC network' "$SCRIPT"; then
  echo -e "${RED}  ✗ PUBLIC dry-run must fail before any real submission${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ PUBLIC dry-run guard present${NC}"

# Verify the network flag targets the right network.
if ! grep -q 'NETWORK_FLAG="--network public"' "$SCRIPT"; then
  echo -e "${RED}  ✗ PUBLIC mode must pass --network public to the stellar CLI${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ PUBLIC mode targets --network public${NC}"

echo ""
echo -e "${GREEN}┌──────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│   Deploy config validation passed!           │${NC}"
echo -e "${GREEN}└──────────────────────────────────────────────┘${NC}"
