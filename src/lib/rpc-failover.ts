import { rpc } from "@stellar/stellar-sdk";

/**
 * Soroban RPC failover configuration.
 * When the primary RPC endpoint fails, the client automatically tries backups.
 */

const FALLBACK_RPC_URLS: Record<string, string[]> = {
  TESTNET: [
    "https://soroban-testnet.stellar.org:443",
    "https://rpc-futurenet.stellar.org:443",
  ],
  PUBLIC: [
    "https://soroban.stellar.org:443",
    "https://mainnet.soroban.rpc.pulse.so:443",
  ],
};

/**
 * Get a working Soroban RPC server, trying the primary endpoint first
 * then falling back to alternatives. Returns the first reachable server.
 */
export async function getWorkingRpcServer(
  network: "TESTNET" | "PUBLIC" = "TESTNET"
): Promise<rpc.Server> {
  const urls = FALLBACK_RPC_URLS[network] || FALLBACK_RPC_URLS.TESTNET;

  for (const url of urls) {
    try {
      const server = new rpc.Server(url, { allowHttp: false });
      // Quick health check
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) return server;
    } catch {
      // Try next endpoint
      continue;
    }
  }

  // All endpoints failed — return primary as last resort
  return new rpc.Server(urls[0], { allowHttp: false });
}

/**
 * Get all configured RPC URLs for a network.
 */
export function getRpcUrls(network: "TESTNET" | "PUBLIC" = "TESTNET"): string[] {
  return FALLBACK_RPC_URLS[network] || FALLBACK_RPC_URLS.TESTNET;
}
