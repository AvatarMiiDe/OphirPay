"use client";
// SPDX-License-Identifier: MIT

import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { STORAGE_KEYS } from "@/lib/storage-keys";

export type DisplayCurrency = "XLM" | "USD";

export interface UseCurrencyDisplayReturn {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  toggleCurrency: () => void;
  isXlm: boolean;
  isUsd: boolean;
}

/**
 * Hook for persisting and toggling currency display preference (XLM ↔ USD) in localStorage.
 */
export function useCurrencyDisplay(
  defaultCurrency: DisplayCurrency = "XLM"
): UseCurrencyDisplayReturn {
  const [currency, setCurrency] = useLocalStorage<DisplayCurrency>(
    STORAGE_KEYS.CURRENCY_DISPLAY,
    defaultCurrency
  );

  const toggleCurrency = useCallback(() => {
    setCurrency((prev) => (prev === "XLM" ? "USD" : "XLM"));
  }, [setCurrency]);

  return {
    currency,
    setCurrency,
    toggleCurrency,
    isXlm: currency === "XLM",
    isUsd: currency === "USD",
  };
}
