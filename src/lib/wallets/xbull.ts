import type { WalletConnector, SignOptions } from "./types";

/**
 * xBull wallet connector.
 *
 * xBull is a feature-rich Stellar browser extension wallet.
 * It injects `window.xBullSDK` into the page.
 *
 * Docs: https://github.com/Creit-Tech/xBull-Wallet
 */

interface XBullAPI {
  connect: () => Promise<string>;
  getPublicKey: () => Promise<string>;
  sign: (params: {
    xdr: string;
    publicKey?: string;
    network?: string;
  }) => Promise<{ signature: string }>;
  closeConnections: () => Promise<void>;
}

function getXBullApi(): XBullAPI | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { xBullSDK?: XBullAPI }).xBullSDK;
}

export const xBullConnector: WalletConnector = {
  id: "xbull",
  name: "xBull",
  description: "Feature-rich Stellar browser extension",
  icon: "🐂",

  isAvailable(): boolean {
    return !!getXBullApi();
  },

  async connect() {
    const xbull = getXBullApi();
    if (!xbull) {
      throw new Error(
        "xBull wallet not installed. Please install the xBull browser extension.",
      );
    }
    // xBull's connect() returns the public key
    const publicKey = await xbull.connect();
    return { publicKey, network: "PUBLIC" };
  },

  async disconnect() {
    const xbull = getXBullApi();
    if (xbull) {
      try {
        await xbull.closeConnections();
      } catch {
        // Best effort
      }
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("ophirpay-wallet-connected");
    }
  },

  async signTransaction(xdr: string, opts?: SignOptions) {
    const xbull = getXBullApi();
    if (!xbull) throw new Error("xBull wallet not found. Please reconnect.");
    const result = await xbull.sign({ xdr, network: opts?.network });
    // xBull returns the signature, not the signed XDR
    // For compatibility with submitSignedTx, we may need to attach the signature
    // Since full XDR signing support varies, we return signature for now
    return result.signature;
  },

  async getAddress() {
    const xbull = getXBullApi();
    if (!xbull) return null;
    try {
      return await xbull.getPublicKey();
    } catch {
      return null;
    }
  },

  async getNetwork() {
    // xBull doesn't directly expose network — defaults to PUBLIC
    return "PUBLIC";
  },

  async isConnected() {
    const xbull = getXBullApi();
    if (!xbull) return false;
    try {
      const pk = await xbull.getPublicKey();
      return !!pk;
    } catch {
      return false;
    }
  },
};
