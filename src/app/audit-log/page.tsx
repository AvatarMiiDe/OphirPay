"use client";

import { useState, useEffect, useCallback } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface AuditEntry {
  id: number;
  timestamp: number;
  action: string;
  actor: string;
  target_id: number;
  details: string;
}

const ACTION_COLORS: Record<string, "success" | "danger" | "warning" | "info"> = {
  payment_recorded: "success",
  payment_cancelled: "danger",
  escrow_created: "info",
  escrow_released_owner: "success",
  escrow_released_arbiter: "warning",
  escrow_claimed: "success",
  stream_created: "info",
  stream_claimed: "success",
  stream_cancelled: "danger",
  batch_created: "info",
  contract_paused: "danger",
  contract_unpaused: "success",
  role_granted: "info",
  role_revoked: "warning",
  multisig_configured: "info",
  multisig_proposed: "info",
  multisig_executed: "success",
  fee_config_set: "info",
  upgrade_proposed: "warning",
  upgrade_executed: "success",
  upgrade_cancelled: "danger",
  emergency_withdraw: "danger",
  ownership_transferred: "warning",
  timelock_proposed: "info",
  timelock_executed: "success",
  timelock_cancelled: "danger",
  proposal_created: "info",
  proposal_passed: "success",
  proposal_defeated: "danger",
  recurring_created: "info",
  recurring_executed: "success",
  recurring_cancelled: "danger",
  spending_limit_set: "info",
  escalation_configured: "info",
  governance_configured: "info",
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/audit-log");
      if (res.ok) setEntries((await res.json()).data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const filtered = filter
    ? entries.filter((e) => e.action.includes(filter) || e.details.toLowerCase().includes(filter.toLowerCase()))
    : entries;

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleString();
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            📋 Audit Log
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Immutable on-chain trail of every contract state change
          </p>
        </div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by action or details..."
          className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm w-full sm:w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
          title={filter ? "No Matching Entries" : "No Audit Entries"}
          description={filter ? "Try a different filter term." : "Contract activity will appear here as state changes occur."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <Card key={entry.id} className="p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <Badge variant={ACTION_COLORS[entry.action] ?? "info"}>
                {entry.action.replace(/_/g, " ")}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{entry.details}</p>
                <p className="text-xs text-gray-400 truncate">
                  Actor: {entry.actor?.slice?.(0, 8)}...{entry.actor?.slice?.(-4)}
                  {entry.target_id > 0 ? ` · Target ID: ${entry.target_id}` : ""}
                </p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(entry.timestamp)}</span>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Showing {filtered.length} of {entries.length} entries · All entries are stored immutably on-chain
      </p>
    </div>
  );
}
