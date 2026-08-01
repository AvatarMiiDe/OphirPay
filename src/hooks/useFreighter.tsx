"use client";

import {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
} from "react";
import type { WalletState, FreighterAPI } from "@/types";
import { fetchXlmBalance } from "@/lib/stellar";

// ── Context ───────────────────────────────────────────────────

const WalletContext = createContext<WalletContextType | null>(null);

interface WalletContextType {
  wallet: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  fetchBalance: () => Promise<void>;
  isConnecting: boolean;
  error: string | null;
}

// ── Helpers ───────────────────────────────────────────────────

export function getFreighter(): FreighterAPI | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { freighter?: FreighterAPI }).freighter;
}

// ── Provider ──────────────────────────────────────────────────

const initialWalletState: WalletState = {
  connected: false,
  publicKey: null,
  network: null,
  balance: null,
  balanceLoading: false,
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already connected on mount
  useEffect(() => {
    checkExistingConnection();
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

  const checkExistingConnection = async () => {
    try {
      const freighter = getFreighter();
      if (!freighter) return;

      const connected = await freighter.isConnected();
      if (connected) {
        const publicKey = await freighter.getAddress();
        const network = await freighter.getNetwork();
        setWallet((prev) => ({
          ...prev,
          connected: true,
          publicKey,
          network,
        }));
        if (publicKey) {
          loadBalance(publicKey);
        }
      }
    } catch {
      // Freighter not available or user rejected
    }
  };

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const freighter = getFreighter();
      if (!freighter) {
        throw new Error(
          "Freighter wallet not installed. Please install the Freighter browser extension."
        );
      }

      await freighter.requestAccess();
      const publicKey = await freighter.getAddress();
      const network = await freighter.getNetwork();

      setWallet({
        connected: true,
        publicKey,
        network,
        balance: null,
        balanceLoading: true,
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
  }, [loadBalance]);

  const disconnect = useCallback(() => {
    setWallet(initialWalletState);
    setError(null);
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!wallet.publicKey) return;
    await loadBalance(wallet.publicKey);
  }, [wallet.publicKey, loadBalance]);

  return (
    <WalletContext.Provider
      value={{ wallet, connect, disconnect, fetchBalance, isConnecting, error }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
