"use client";

import { formatAmount, timeAgo, getStatusColor, shortenAddress } from "@/lib/utils";

// ── Mock payment data ─────────────────────────────────────────

const mockPayments = [
  {
    id: "1",
    description: "Vendor payment - Cloud Services",
    amount: 2500,
    assetCode: "XLM",
    status: "COMPLETED" as const,
    destAddress: "GBD4RXYZ1234567890ABCDEFGHIJKLMNOPQRST",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    transactionHash: "abc123def456abc123def456abc123def456abc123def456",
  },
  {
    id: "2",
    description: "Contributor reward - Oct 2026",
    amount: 5000,
    assetCode: "XLM",
    status: "COMPLETED" as const,
    destAddress: "GA24LABCDEFGH1234567890IJKLMNOPQRSTUV",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    transactionHash: "ghi789jkl012ghi789jkl012ghi789jkl012ghi789jkl012",
  },
  {
    id: "3",
    description: "Grant distribution - Wave 3",
    amount: 25000,
    assetCode: "USDC",
    status: "PROCESSING" as const,
    destAddress: "GC78XPQRSTUVWXYZ9876543210ABCDEFGHIJKLM",
    createdAt: new Date(Date.now() - 600000).toISOString(),
    transactionHash: undefined,
  },
  {
    id: "4",
    description: "Operational transfer - Sept",
    amount: 1000,
    assetCode: "XLM",
    status: "PENDING" as const,
    destAddress: "GD5ETUVWXYZ1234567890ABCDEFGHIJKLMNOPQRS",
    createdAt: new Date(Date.now() - 120000).toISOString(),
    transactionHash: undefined,
  },
  {
    id: "5",
    description: "Refund - Invoice #452",
    amount: 350.75,
    assetCode: "XLM",
    status: "FAILED" as const,
    destAddress: "GA24LABCDEFGH1234567890IJKLMNOPQRSTUV",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    transactionHash: "mno345pqr678mno345pqr678mno345pqr678mno345pqr678",
  },
  {
    id: "6",
    description: "Payroll - Software Team",
    amount: 45000,
    assetCode: "XLM",
    status: "CANCELLED" as const,
    destAddress: "GC78XPQRSTUVWXYZ9876543210ABCDEFGHIJKLM",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    transactionHash: undefined,
  },
];

// ── Page ──────────────────────────────────────────────────────

export default function PaymentsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Payments
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage and track all your payment transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search payments..."
              className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ophir-500 focus:border-transparent w-64"
            />
          </div>
          {/* New Payment */}
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ophir-600 text-white text-sm font-medium hover:bg-ophir-700 transition-colors shadow-lg shadow-ophir-500/25 active:scale-95">
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
            New Payment
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        {["All", "Pending", "Processing", "Completed", "Failed"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === "All"
                ? "text-ophir-600 dark:text-ophir-400 border-b-2 border-ophir-600 dark:border-ophir-400 bg-ophir-50/50 dark:bg-ophir-950/20"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                <th className="py-3 px-4 font-medium">Description</th>
                <th className="py-3 px-4 font-medium">Amount</th>
                <th className="py-3 px-4 font-medium">Destination</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {mockPayments.map((payment) => {
                const statusColor = getStatusColor(payment.status);
                return (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {payment.description}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300 font-mono">
                      {formatAmount(payment.amount, payment.assetCode)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs text-gray-400">
                        {shortenAddress(payment.destAddress)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${statusColor.dot}`}
                        />
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">
                      {timeAgo(payment.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      {payment.transactionHash ? (
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${payment.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-ophir-600 dark:text-ophir-400 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {shortenAddress(payment.transactionHash)}
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium">6</span> of{" "}
            <span className="font-medium">234</span> payments
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-md text-sm border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
              Previous
            </button>
            <button className="px-3 py-1.5 rounded-md text-sm bg-ophir-600 text-white">
              1
            </button>
            <button className="px-3 py-1.5 rounded-md text-sm border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              2
            </button>
            <button className="px-3 py-1.5 rounded-md text-sm border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              3
            </button>
            <button className="px-3 py-1.5 rounded-md text-sm border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
