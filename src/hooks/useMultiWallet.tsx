"use client";
// SPDX-License-Identifier: MIT


import {
  useState,
  useCallback,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
import type { MultiWalletState, WalletId } from "@/lib/wallets";
import { getWalletConnector, getAvailableWallets } from "@/lib/wallets";
import { fetchXlmBalance } from "@/lib/stellar";

// ── Context ───────────────────────────────────────────────────

const WalletContext = createContext<WalletContextType | null>(null);

interface WalletContextType {
  wallet: MultiWalletState;
  connect: (walletId: WalletId) => Promise<void>;
  disconnect: () => Promise<void>;
  fetchBalance: () => Promise<void>;
  isConnecting: boolean;
  error: string | null;
  availableWallets: WalletId[];
}

// ── Initial State ─────────────────────────────────────────────

const initialWalletState: MultiWalletState = {
  connected: false,
  publicKey: null,
  network: null,
  balance: null,
  balanceLoading: false,
  activeWalletId: null,
};

// ── Provider ──────────────────────────────────────────────────

export function MultiWalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<MultiWalletState>(initialWalletState);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletId[]>([]);

  // Detect available wallets on mount
  useEffect(() => {
    const wallets = getAvailableWallets();
    setAvailableWallets(wallets.map((w) => w.id));
  }, []);

  const loadBalance = useCallback(async (publicKey: string) => {
    setWallet((prev) => ({ ...prev, balanceLoading: true }));
    try {
      const balance = await fetchXlmBalance(publicKey);
      setWallet((prev) => ({ ...prev, balance, balanceLoading: false }));
    } catch {
      setWallet((prev) => ({ ...prev, balanceLoading: false }));
    }
  }, []);

  const loadBalanceRef = useRef(loadBalance);
  loadBalanceRef.current = loadBalance;

  // Try to auto-reconnect on mount (check all available wallets)
  useEffect(() => {
    const autoReconnect = async () => {
      for (const walletId of ["freighter", "albedo", "xbull"] as WalletId[]) {
        try {
          const connector = getWalletConnector(walletId);
          if (!connector.isAvailable()) continue;
          const connected = await connector.isConnected();
          if (connected) {
            const publicKey = await connector.getAddress();
            const network = await connector.getNetwork();
            if (publicKey) {
              setWallet({
                connected: true,
                publicKey,
                network,
                balance: null,
                balanceLoading: true,
                activeWalletId: walletId,
              });
              loadBalanceRef.current(publicKey);
              return; // Connected to first available wallet
            }
          }
        } catch {
          // Try next wallet
        }
      }
    };

    autoReconnect();
  }, []);

  const connect = useCallback(
    async (walletId: WalletId) => {
      setIsConnecting(true);
      setError(null);

      try {
        const connector = getWalletConnector(walletId);
        if (!connector.isAvailable()) {
          throw new Error(
            `${connector.name} is not available. Please install it first.`,
          );
        }

        const { publicKey, network } = await connector.connect();

        setWallet({
          connected: true,
          publicKey,
          network,
          balance: null,
          balanceLoading: true,
          activeWalletId: walletId,
        });

        if (publicKey) {
          loadBalance(publicKey);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to connect wallet";
        setError(message);
      } finally {
        setIsConnecting(false);
      }
    },
    [loadBalance],
  );

  const disconnect = useCallback(async () => {
    if (wallet.activeWalletId) {
      try {
        const connector = getWalletConnector(wallet.activeWalletId);
        await connector.disconnect();
      } catch {
        // Best effort
      }
    }
    setWallet(initialWalletState);
    setError(null);
  }, [wallet.activeWalletId]);

  // Auto-refresh balance every 30 seconds when connected
  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey) return;
    const interval = setInterval(() => {
      loadBalance(wallet.publicKey!);
    }, 30000);
    return () => clearInterval(interval);
  }, [wallet.connected, wallet.publicKey, loadBalance]);

  const fetchBalance = useCallback(async () => {
    if (!wallet.publicKey) return;
    await loadBalance(wallet.publicKey);
  }, [wallet.publicKey, loadBalance]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connect,
        disconnect,
        fetchBalance,
        isConnecting,
        error,
        availableWallets,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a MultiWalletProvider");
  }
  return context;
}
