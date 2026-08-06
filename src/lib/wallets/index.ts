export type { WalletId, WalletConnector, SignOptions, MultiWalletState } from "./types";
export { WALLET_REGISTRY } from "./types";
export { freighterConnector } from "./freighter";
export { albedoConnector } from "./albedo";
export { xBullConnector } from "./xbull";

import type { WalletConnector, WalletId } from "./types";
import { freighterConnector } from "./freighter";
import { albedoConnector } from "./albedo";
import { xBullConnector } from "./xbull";

/**
 * Map of all available wallet connectors by ID.
 */
export const walletConnectors: Record<WalletId, WalletConnector> = {
  freighter: freighterConnector,
  albedo: albedoConnector,
  xbull: xBullConnector,
  // Ledger requires WebUSB/HID and the Stellar Ledger app.
  // To add Ledger support, install @ledgerhq/hw-transport-webusb and
  // @stellar/stellar-sdk Ledger integration, then add a ledger connector here.
  ledger: {
    id: "ledger",
    name: "Ledger",
    description: "Hardware wallet — connect your Ledger device",
    icon: "🔐",
    isAvailable: () => typeof window !== "undefined" && "usb" in navigator,
    connect: async () => {
      throw new Error(
        "Ledger support requires a Ledger device with the Stellar app open. Coming soon.",
      );
    },
    disconnect: async () => {},
    signTransaction: async () => {
      throw new Error("Ledger signing not yet implemented.");
    },
    getAddress: async () => null,
    getNetwork: async () => "PUBLIC",
    isConnected: async () => false,
  } as WalletConnector,
};

/**
 * Get a wallet connector by ID.
 */
export function getWalletConnector(id: WalletId): WalletConnector {
  return walletConnectors[id];
}

/**
 * Get all available (installed) wallet connectors.
 */
export function getAvailableWallets(): WalletConnector[] {
  return Object.values(walletConnectors).filter((w) => w.isAvailable());
}
