"use client";

import { useState, useEffect, useCallback } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useWallet } from "@/hooks/useFreighter";
import { registerHook, unregisterHook } from "@/lib/contract-advanced";

const EVENT_TYPES = [
  "payment_recorded",
  "escrow_created",
  "escrow_released",
  "escrow_claimed",
  "refund_processed",
  "stream_created",
  "stream_claimed",
  "batch_created",
  "proposal_created",
] as const;

interface Hook {
  id: number;
  subscriber: string;
  event_type: string;
  webhook_url: string;
  active: boolean;
  created_at: number;
}

export default function HooksPage() {
  const { wallet } = useWallet();
  const toast = useToast();
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formEventType, setFormEventType] = useState<string>(EVENT_TYPES[0]);
  const [formWebhookUrl, setFormWebhookUrl] = useState("");

  const fetchHooks = useCallback(async () => {
    try {
      const res = await fetch("/api/hooks");
      if (res.ok) setHooks((await res.json()).data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHooks(); }, [fetchHooks]);

  const handleRegister = async () => {
    if (!wallet.publicKey) { toast.error("Connect your wallet first"); return; }
    if (!formWebhookUrl) { toast.error("Webhook URL is required"); return; }
    setSubmitting(true);
    try {
      const result = await registerHook(wallet.publicKey, formEventType, formWebhookUrl);
      if (result.success) {
        toast.success("Notification hook registered on-chain");
        setShowRegister(false);
        setFormWebhookUrl("");
        setHooks((prev) => [...prev, {
          id: Date.now(),
          subscriber: wallet.publicKey!,
          event_type: formEventType,
          webhook_url: formWebhookUrl,
          active: true,
          created_at: Math.floor(Date.now() / 1000),
        }]);
      } else {
        toast.error(result.error || "Failed to register hook");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (hookId: number) => {
    if (!wallet.publicKey) { toast.error("Connect your wallet first"); return; }
    try {
      const result = await unregisterHook(wallet.publicKey, hookId);
      if (result.success) {
        toast.success("Hook deactivated on-chain");
        setHooks((prev) => prev.map((h) =>
          h.id === hookId ? { ...h, active: false } : h
        ));
      } else {
        toast.error(result.error || "Failed to deactivate hook");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const showConnectBanner = !wallet.connected;

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {showConnectBanner && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 flex items-center gap-3 animate-fade-in">
          <span className="text-amber-500 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Wallet not connected</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Connect your wallet to register and manage on-chain notification hooks.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🔔 Notification Hooks</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            On-chain webhook subscriptions — queryable by off-chain relayers
          </p>
        </div>
        <Button onClick={() => setShowRegister(true)}>+ Register Hook</Button>
      </div>

      {hooks.length === 0 ? (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          }
          title="No Notification Hooks"
          description="Register a hook to receive webhook deliveries when on-chain events fire. Off-chain relayers query the contract to find your subscriptions."
          actionLabel="Register Hook"
          onAction={() => setShowRegister(true)}
        />
      ) : (
        <div className="space-y-3">
          {hooks.map((hook) => (
            <Card key={hook.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-gray-500">#{hook.id}</span>
                    <Badge variant={hook.active ? "success" : "danger"}>
                      {hook.active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="info">{hook.event_type}</Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all">
                      {hook.webhook_url}
                    </p>
                    <p className="text-xs text-gray-400">
                      Subscriber: {hook.subscriber?.slice(0, 14)}... · Registered: {new Date(hook.created_at * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {hook.active && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeactivate(hook.id)}
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Register Modal */}
      <Modal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        title="Register Notification Hook"
        description="Subscribe to on-chain events and receive webhook deliveries from our relayers."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Event Type
            </label>
            <select
              value={formEventType}
              onChange={(e) => setFormEventType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              {EVENT_TYPES.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Webhook URL
            </label>
            <input
              value={formWebhookUrl}
              onChange={(e) => setFormWebhookUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 font-mono text-sm"
              placeholder="https://your-server.com/webhook"
            />
          </div>
          <Button onClick={handleRegister} loading={submitting} className="w-full">
            Register On-Chain
          </Button>
        </div>
      </Modal>
    </div>
  );
}
