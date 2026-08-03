"use client";

import { useState, useEffect, useRef } from "react";
import { shortenAddress } from "@/lib/utils";

interface PaymentEvent {
  event: string;
  timestamp: string;
  paymentId: string;
  status: string;
  amount?: string;
  txHash?: string;
}

export default function EventsPage() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.addEventListener("connected", () => {
      setConnected(true);
    });

    eventSource.addEventListener("heartbeat", () => {
      // Keep-alive, no action needed
    });

    const eventTypes = [
      "payment:created",
      "payment:submitted",
      "payment:completed",
      "payment:failed",
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (e) => {
        try {
          const data = JSON.parse(e.data);
          setEvents((prev) => [data, ...prev].slice(0, 50));
        } catch {}
      });
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Event Streaming
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time payment events via Server-Sent Events (SSE)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected ? "bg-green-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Live Event Feed
        </h2>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {events.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
              Waiting for events...
            </p>
          )}
          {events.map((evt, i) => (
            <div
              key={`${evt.paymentId}-${i}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
            >
              <span
                className={`h-2 w-2 rounded-full flex-shrink-0 ${
                  evt.status === "COMPLETED"
                    ? "bg-green-500"
                    : evt.status === "FAILED"
                      ? "bg-red-500"
                      : "bg-blue-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {evt.event}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  {shortenAddress(evt.paymentId, 8)}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  evt.status === "COMPLETED"
                    ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : evt.status === "FAILED"
                      ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                }`}
              >
                {evt.status}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(evt.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
