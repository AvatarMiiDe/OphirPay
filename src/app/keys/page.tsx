"use client";
// SPDX-License-Identifier: MIT

import { useState } from "react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useApiQuery } from "@/hooks/useApiQuery";

interface KeyUsage {
  id: string;
  name: string;
  prefix: string;
  lastUsed: string | null;
  createdAt: string;
  expiresAt: string | null;
  total: number;
  window: number;
}

interface KeyStatsResponse {
  window: string;
  keys: KeyUsage[];
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function ApiKeysPage() {
  const [window, setWindow] = useState("30d");
  const { data, isLoading, error } = useApiQuery<KeyStatsResponse>(["api-keys", "stats", window], `/api/keys/stats?window=${window}`);

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb items={[{ label: "API Keys" }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Request volume and activity by credential</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          Window
          <select value={window} onChange={(event) => setWindow(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </label>
      </div>

      <Card padding="none">
        {isLoading ? <LoadingSkeleton variant="table" /> : error ? (
          <div className="p-6 text-sm text-red-600 dark:text-red-400">Failed to load API key usage: {error.message}</div>
        ) : data?.keys.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
                <tr><th className="px-6 py-3 font-medium">Key</th><th className="px-6 py-3 font-medium">Requests ({data.window})</th><th className="px-6 py-3 font-medium">All time</th><th className="px-6 py-3 font-medium">Last used</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.keys.map((key) => <tr key={key.id} className="text-gray-700 dark:text-gray-300">
                  <td className="px-6 py-4"><div className="font-medium text-gray-900 dark:text-white">{key.name}</div><div className="font-mono text-xs text-gray-500">{key.prefix}...</div></td>
                  <td className="px-6 py-4 font-semibold text-ophir-700 dark:text-ophir-400">{key.window.toLocaleString()}</td>
                  <td className="px-6 py-4">{key.total.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(key.lastUsed)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        ) : <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">No API keys yet.</div>}
      </Card>
    </div>
  );
}