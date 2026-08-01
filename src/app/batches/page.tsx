"use client";

import Link from "next/link";
import { formatAmount, timeAgo, shortenAddress, getStatusColor } from "@/lib/utils";

// ── Mock batch data ───────────────────────────────────────────

const mockBatches = [
  {
    id: "1",
    name: "October Payroll",
    description: "Monthly payroll for software team",
    status: "COMPLETED" as const,
    recipientCount: 12,
    totalAmount: 45000,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    txHash: "abc123def456abc123def456abc123def456abc123def456",
  },
  {
    id: "2",
    name: "Vendor Payments - Q4",
    description: "Cloud, hosting, and SaaS vendors",
    status: "PROCESSING" as const,
    recipientCount: 5,
    totalAmount: 12500,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "3",
    name: "DAO Contributor Rewards",
    description: "October contribution rewards for 8 contributors",
    status: "COMPLETED" as const,
    recipientCount: 8,
    totalAmount: 32000,
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    txHash: "ghi789jkl012ghi789jkl012ghi789jkl012ghi789jkl012",
  },
  {
    id: "4",
    name: "Grant Distribution - Wave 3",
    description: "Quarterly grant payments to 15 beneficiaries",
    status: "PARTIALLY_COMPLETED" as const,
    recipientCount: 15,
    totalAmount: 89000,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

// ── Page ──────────────────────────────────────────────────────

export default function BatchesPage() {
  const hasBatches = mockBatches.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Batch Payments
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Process multiple payments in a single transaction
          </p>
        </div>
        <Link
          href="/batches/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ophir-600 text-white text-sm font-medium hover:bg-ophir-700 transition-colors shadow-lg shadow-ophir-500/25 active:scale-95"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Batch
        </Link>
      </div>

      {hasBatches ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-4 font-medium">Recipients</th>
                  <th className="py-3 px-4 font-medium">Total</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">TX</th>
                </tr>
              </thead>
              <tbody>
                {mockBatches.map((batch) => {
                  const statusColor = getStatusColor(batch.status);
                  return (
                    <tr
                      key={batch.id}
                      className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {batch.name}
                        </p>
                        {batch.description && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {batch.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {batch.recipientCount} addresses
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300 font-mono text-sm">
                        {formatAmount(batch.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusColor.dot}`}
                          />
                          {batch.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">
                        {timeAgo(batch.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        {batch.txHash ? (
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${batch.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-ophir-600 dark:text-ophir-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {shortenAddress(batch.txHash)}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
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
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No Batch Payments Yet
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Create batch payments for payroll, vendor payments, grant distributions, and more.
          </p>
          <Link
            href="/batches/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ophir-600 text-white text-sm font-medium hover:bg-ophir-700 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Batch
          </Link>
        </div>
      )}
    </div>
  );
}
