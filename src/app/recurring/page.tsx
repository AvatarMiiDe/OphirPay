"use client";

import { EmptyState } from "@/components/EmptyState";

export default function RecurringPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Recurring Payments
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Schedule and manage automated recurring payment workflows
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
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182"
            />
          </svg>
        }
        title="No Recurring Payments Yet"
        description="Set up recurring payments for payroll, subscriptions, DAO contributor rewards, and grant distributions."
        actionLabel="Create Recurring Payment"
      />
    </div>
  );
}
