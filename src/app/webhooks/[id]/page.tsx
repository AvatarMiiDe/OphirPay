"use client";
// SPDX-License-Identifier: MIT

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { useToast } from "@/components/ui/Toast";
import { useApiQuery, useApiMutation, type ApiError } from "@/hooks/useApiQuery";
import { WEBHOOK_EVENT_LABELS } from "@/app/api/webhooks/event-types";
import type { WebhookEventType } from "@/app/api/webhooks/event-types";

interface WebhookDetail {
  id: string;
  url: string;
  events: string;
  isActive: boolean;
  hasSecret: boolean;
  createdAt: string;
}

interface DeliveryRecord {
  id: string;
  eventId: string;
  eventType: string;
  eventTimestamp: string;
  status: string;
  responseCode: number | null;
  latencyMs: number | null;
  attempts: number;
  errorMessage: string | null;
  isReplay: boolean;
  replayBatchId: string | null;
  deliveredAt: string;
  payload: {
    event: string;
    timestamp: string;
    data: Record<string, unknown>;
  };
}

interface RedeliverResult {
  deliveryId: string;
  priorDeliveryId: string;
  status: string;
  responseCode?: number;
  latencyMs: number;
  attempts: number;
  errorMessage?: string;
}

function parseEvents(events: string): WebhookEventType[] {
  try {
    return JSON.parse(events) as WebhookEventType[];
  } catch {
    return [];
  }
}

function statusVariant(status: string): "success" | "danger" | "warning" | "info" {
  if (status === "SUCCESS") return "success";
  if (status === "FAILED") return "danger";
  return "info";
}

export default function WebhookDeliveryDashboardPage() {
  const params = useParams();
  const webhookId = params.id as string;
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [redelivering, setRedelivering] = useState<string | null>(null);

  const { data: webhook, isLoading: webhookLoading } = useApiQuery<WebhookDetail>(
    ["webhook", webhookId],
    `/api/webhooks/${webhookId}`,
  );

  const {
    data: rawDeliveries,
    isLoading: deliveriesLoading,
    refetch: refetchDeliveries,
  } = useApiQuery<DeliveryRecord[]>(
    ["webhook-deliveries", webhookId],
    `/api/webhooks/${webhookId}/deliveries?limit=50`,
  );

  const deliveries = Array.isArray(rawDeliveries) ? rawDeliveries : [];

  const redeliverMutation = useApiMutation<
    { webhookId: string; deliveryId: string },
    RedeliverResult
  >(
    (body) => `/api/webhooks/${body.webhookId}/deliveries/${body.deliveryId}/redeliver`,
    { invalidateKeys: [["webhook-deliveries", webhookId]] },
  );

  const handleRedeliver = async (deliveryId: string) => {
    setRedelivering(deliveryId);
    try {
      const result = await redeliverMutation.mutateAsync({ webhookId, deliveryId });
      toast.success(
        result.status === "SUCCESS" ? "Redelivered" : "Redeliver failed",
        result.status === "SUCCESS"
          ? `Delivered in ${result.latencyMs}ms`
          : result.errorMessage ?? "Delivery failed",
      );
      await refetchDeliveries();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to redeliver");
    } finally {
      setRedelivering(null);
    }
  };

  if (webhookLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!webhook) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link href="/webhooks" className="text-sm text-ophir-600 hover:underline">
          ← Back to Webhooks
        </Link>
        <p className="text-gray-500">Webhook not found.</p>
      </div>
    );
  }

  const events = parseEvents(webhook.events);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link href="/webhooks" className="text-sm text-ophir-600 dark:text-ophir-400 hover:underline">
          ← Back to Webhooks
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
          Delivery Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Monitor webhook deliveries, inspect failures, and redeliver payloads.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className="font-mono text-sm text-gray-900 dark:text-white truncate">
                {webhook.url}
              </p>
              <CopyButton value={webhook.url} />
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {events.map((evt) => (
                <Badge key={evt} variant="info">
                  {WEBHOOK_EVENT_LABELS[evt] ?? evt}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span
                className={`flex items-center gap-1 ${
                  webhook.isActive ? "text-green-600 dark:text-green-400" : ""
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    webhook.isActive ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                {webhook.isActive ? "Active" : "Paused"}
              </span>
              <span>{deliveries.length} recent deliveries</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Delivery History
          </h2>
        </div>

        {deliveriesLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading deliveries...</div>
        ) : deliveries.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No deliveries recorded yet. Events will appear here after webhook dispatches.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {deliveries.map((d) => {
              const isExpanded = expandedId === d.id;
              const failed = d.status === "FAILED";
              return (
                <div key={d.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-sm text-gray-900 dark:text-white">
                          {d.eventType}
                        </span>
                        <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                        {d.isReplay && <Badge variant="info">replay</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {new Date(d.deliveredAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        {d.latencyMs != null && <span>{d.latencyMs}ms latency</span>}
                        <span>{d.attempts} attempt{d.attempts !== 1 ? "s" : ""}</span>
                        {d.responseCode != null && <span>HTTP {d.responseCode}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {failed && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : d.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors"
                        >
                          {isExpanded ? "Hide" : "Details"}
                        </button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={redelivering === d.id || !webhook.isActive}
                        onClick={() => handleRedeliver(d.id)}
                      >
                        {redelivering === d.id ? "Sending..." : "Redeliver"}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && failed && (
                    <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 space-y-2">
                      <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                        Failure Details
                      </p>
                      {d.errorMessage && (
                        <p className="text-xs text-red-700 dark:text-red-400 font-mono break-all">
                          {d.errorMessage}
                        </p>
                      )}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-red-600 dark:text-red-400 hover:underline">
                          View payload
                        </summary>
                        <pre className="mt-2 p-3 rounded bg-gray-900 text-green-400 overflow-x-auto text-xs">
                          {JSON.stringify(d.payload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
