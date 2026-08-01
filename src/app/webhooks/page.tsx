"use client";

import { EmptyState } from "@/components/EmptyState";

export default function WebhooksPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Webhooks
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configure webhook endpoints for real-time payment event notifications
        </p>
      </div>
      <EmptyState
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-8 h-8 text-gray-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
            />
          </svg>
        }
        title="No Webhooks Yet"
        description="Set up webhooks to receive real-time notifications for payment events like completions and failures."
        actionLabel="Add Webhook"
      />
    </div>
  );
}
