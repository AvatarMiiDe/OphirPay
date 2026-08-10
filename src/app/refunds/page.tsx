"use client";
// SPDX-License-Identifier: MIT


import { useState, useEffect, useCallback } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useWallet } from "@/hooks/useMultiWallet";
import { requestRefund, approveRefund, processRefund } from "@/lib/contract-advanced";

const REASON_CODES = [
  { value: 0, label: "Product Defect" },
  { value: 1, label: "Non-Delivery" },
  { value: 2, label: "Duplicate Charge" },
  { value: 3, label: "Unauthorized" },
  { value: 4, label: "Customer Request" },
  { value: 5, label: "Other" },
] as const;

const STATUS_COLORS: Record<string, ReturnType<typeof Badge>["props"]["variant"]> = {
  Requested: "warning",
  Approved: "info",
  Rejected: "danger",
  Processed: "success",
};

interface Refund {
  id: number;
  payment_id: number;
  requester: string;
  amount: number;
  reason: string;
  reason_code: number;
  status: string;
  requested_at: number;
  resolved_at: number;
}

export default function RefundsPage() {
  const { wallet } = useWallet();
  const toast = useToast();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [analytics, setAnalytics] = useState<{ code: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");

  const [formPaymentId, setFormPaymentId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formAsset, setFormAsset] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formReasonCode, setFormReasonCode] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [refundsRes, analyticsRes] = await Promise.all([
        fetch("/api/refunds"),
        fetch("/api/refunds?analytics=true"),
      ]);
      if (refundsRes.ok) setRefunds((await refundsRes.json()).data ?? []);
      if (analyticsRes.ok) setAnalytics((await analyticsRes.json()).data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRequest = async () => {
    if (!wallet.publicKey) { toast.error("Connect your wallet first"); return; }
    if (!formPaymentId || !formAmount) { toast.error("Payment ID and amount are required"); return; }
    setSubmitting(true);
    try {
      const result = await requestRefund(
        wallet.publicKey,
        parseInt(formPaymentId, 10),
        parseFloat(formAmount) || 0,
        formAsset || "native",
        formReason || "Refund requested",
        formReasonCode,
      );
      if (result.success) {
        toast.success("Refund requested on-chain");
        setShowRequest(false);
        setFormPaymentId("");
        setFormAmount("");
        setFormAsset("");
        setFormReason("");
        setRefunds((prev) => [...prev, {
          id: Date.now(),
          payment_id: parseInt(formPaymentId),
          requester: wallet.publicKey!,
          amount: parseFloat(formAmount) || 0,
          reason: formReason || "Refund requested",
          reason_code: formReasonCode,
          status: "Requested",
          requested_at: Math.floor(Date.now() / 1000),
          resolved_at: 0,
        }]);
      } else {
        toast.error(result.error || "Failed to request refund");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (refundId: number) => {
    if (!wallet.publicKey) { toast.error("Connect your wallet first"); return; }
    try {
      const result = await approveRefund(wallet.publicKey, refundId);
      if (result.success) {
        toast.success("Refund approved on-chain");
        setRefunds((prev) => prev.map((r) =>
          r.id === refundId ? { ...r, status: "Approved" } : r
        ));
      } else {
        toast.error(result.error || "Approval failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleProcess = async (refundId: number) => {
    try {
      const result = await processRefund(refundId);
      if (result.success) {
        toast.success("Refund processed on-chain — tokens returned");
        setRefunds((prev) => prev.map((r) =>
          r.id === refundId ? { ...r, status: "Processed" } : r
        ));
      } else {
        toast.error(result.error || "Processing failed");
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
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const reasonLabel = (code: number) => REASON_CODES.find((r) => r.value === code)?.label ?? "Unknown";
  const maxAnalytics = Math.max(...analytics.map((a) => a.count), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {showConnectBanner && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 flex items-center gap-3 animate-fade-in">
          <span className="text-amber-500 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Wallet not connected</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Connect your wallet to request, approve, and process refunds on-chain.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">↩️ Refunds</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Structured refund lifecycle — Request → Approve → Process
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "analytics"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Analytics
            </button>
          </div>
          <Button onClick={() => setShowRequest(true)}>+ Request Refund</Button>
        </div>
      </div>

      {activeTab === "analytics" && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Reason Code Analytics
          </h2>
          {analytics.length === 0 ? (
            <p className="text-sm text-gray-500">No refund data yet.</p>
          ) : (
            <div className="space-y-2">
              {analytics.map((entry) => (
                <div key={entry.code} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-32">
                    {reasonLabel(entry.code)}
                  </span>
                  <div className="flex-1 h-5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all rounded-full"
                      style={{ width: `${(entry.count / maxAnalytics) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white w-8 text-right">
                    {entry.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "list" && refunds.length === 0 ? (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          }
          title="No Refunds"
          description="Request a refund for an existing payment. Refunds follow a structured lifecycle with reason codes."
          actionLabel="Request Refund"
          onAction={() => setShowRequest(true)}
        />
      ) : activeTab === "list" ? (
        <div className="space-y-3">
          {refunds.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-gray-500">#{r.id}</span>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Payment #{r.payment_id}
                    </h3>
                    <Badge variant={STATUS_COLORS[r.status] ?? "info"}>
                      {r.status}
                    </Badge>
                    <Badge variant="default">{reasonLabel(r.reason_code)}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.reason}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Amount: {r.amount} stroops</span>
                    <span>Requester: {r.requester?.slice(0, 10)}...</span>
                    <span>Requested: {new Date(r.requested_at * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {r.status === "Requested" && (
                    <Button size="sm" variant="primary" onClick={() => handleApprove(r.id)}>
                      Approve
                    </Button>
                  )}
                  {r.status === "Approved" && (
                    <Button size="sm" variant="primary" onClick={() => handleProcess(r.id)}>
                      Process
                    </Button>
                  )}
                  {r.status === "Processed" && (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      ✅ Complete
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Request Refund Modal */}
      <Modal
        open={showRequest}
        onClose={() => setShowRequest(false)}
        title="Request Refund"
        description="Select a payment, provide a reason, and submit an on-chain refund request."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment ID
            </label>
            <input
              value={formPaymentId}
              onChange={(e) => setFormPaymentId(e.target.value)}
              type="number"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="e.g. 42"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (stroops)
            </label>
            <input
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              type="number"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="e.g. 10000000"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Asset Address
            </label>
            <input
              value={formAsset}
              onChange={(e) => setFormAsset(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 font-mono text-sm"
              placeholder="Leave empty for native XLM"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason Code
            </label>
            <select
              value={formReasonCode}
              onChange={(e) => setFormReasonCode(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              {REASON_CODES.map((rc) => (
                <option key={rc.value} value={rc.value}>{rc.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Explanation
            </label>
            <textarea
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Describe why you are requesting this refund..."
            />
          </div>
          <Button onClick={handleRequest} loading={submitting} className="w-full">
            Submit Refund Request
          </Button>
        </div>
      </Modal>
    </div>
  );
}
