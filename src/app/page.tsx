"use client";

import { useWallet } from "@/hooks/useFreighter";
import {
  shortenAddress,
  formatAmount,
  timeAgo,
  getStatusColor,
} from "@/lib/utils";
import { getAccountExplorerUrl } from "@/lib/stellar";
import Link from "next/link";

// ── Mock data ─────────────────────────────────────────────────

const mockAccounts = [
  { name: "Main Treasury", publicKey: "GBD4R...7KLMN", balance: 12500.5 },
  { name: "Operations", publicKey: "GA24L...9PQRS", balance: 3450.25 },
  { name: "Grants Fund", publicKey: "GC78X...3TUVW", balance: 89000.0 },
];

const mockRecentPayments = [
  {
    id: "1",
    description: "Vendor payment - Cloud Services",
    amount: 2500,
    assetCode: "XLM",
    status: "COMPLETED" as const,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    transactionHash: "abc123def456abc123def456abc123def456abc123def456",
  },
  {
    id: "2",
    description: "Contributor reward - Oct",
    amount: 5000,
    assetCode: "XLM",
    status: "COMPLETED" as const,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    transactionHash: "ghi789jkl012ghi789jkl012ghi789jkl012ghi789jkl012",
  },
  {
    id: "3",
    description: "Operational transfer",
    amount: 1000,
    assetCode: "XLM",
    status: "PENDING" as const,
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: "4",
    description: "Refund - Invoice #452",
    amount: 350.75,
    assetCode: "XLM",
    status: "FAILED" as const,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    transactionHash: "mno345pqr678mno345pqr678mno345pqr678mno345pqr678",
  },
];

const mockStats = {
  monthlyVolume: 142500,
  totalPayments: 234,
  pendingPayments: 12,
  successRate: 97.4,
};

// ── Dashboard Component ───────────────────────────────────────

export default function TreasuryDashboard() {
  const { wallet, fetchBalance } = useWallet();

  const totalBalance = wallet.balance ? parseFloat(wallet.balance) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Welcome ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Treasury Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor your financial operations and payment activity
          </p>
        </div>
        {wallet.connected && (
          <Link
            href="/send"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
              bg-gradient-to-r from-ophir-600 to-stellar-dark
              text-white font-medium text-sm
              hover:from-ophir-700 hover:to-stellar
              transition-all duration-300
              shadow-lg shadow-ophir-500/25 hover:shadow-ophir-500/40
              active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
            Send Payment
          </Link>
        )}
      </div>

      {/* ── Stats Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {wallet.connected && wallet.publicKey ? (
          <StatCard
            title="Your XLM Balance"
            value={
              wallet.balanceLoading
                ? "Loading..."
                : formatAmount(totalBalance, "XLM")
            }
            icon="⭐"
            trend={
              <button
                onClick={fetchBalance}
                className="text-xs text-ophir-600 dark:text-ophir-400 hover:underline"
              >
                Refresh
              </button>
            }
          />
        ) : (
          <StatCard
            title="Your XLM Balance"
            value="—"
            icon="⭐"
            trend="Connect wallet"
          />
        )}
        <StatCard
          title="Monthly Volume"
          value={formatAmount(mockStats.monthlyVolume)}
          icon="📊"
          trend="+12.5%"
          trendUp
        />
        <StatCard
          title="Total Payments"
          value={mockStats.totalPayments.toString()}
          icon="💳"
          trend="+8.2%"
          trendUp
        />
        <StatCard
          title="Success Rate"
          value={`${mockStats.successRate}%`}
          icon="✅"
          trend="+0.3%"
          trendUp
        />
      </div>

      {/* ── Accounts & Activity ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Accounts
          </h2>
          <div className="space-y-3">
            {wallet.connected && wallet.publicKey ? (
              <>
                <div className="p-3 rounded-lg bg-ophir-50 dark:bg-ophir-950/20 border border-ophir-200 dark:border-ophir-800">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-ophir-700 dark:text-ophir-400">
                      Connected Wallet
                    </p>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                  </div>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {shortenAddress(wallet.publicKey, 6)}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      XLM Balance
                    </span>
                    <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                      {wallet.balanceLoading
                        ? "Loading..."
                        : formatAmount(parseFloat(wallet.balance ?? "0"), "XLM")}
                    </span>
                  </div>
                  <a
                    href={getAccountExplorerUrl(wallet.publicKey)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-ophir-600 dark:text-ophir-400 hover:underline"
                  >
                    View on Explorer ↗
                  </a>
                </div>
                {mockAccounts.map((acct, i) => (
                  <AccountRow key={i} {...acct} />
                ))}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="h-12 w-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-gray-400"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Connect your Freighter wallet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  to view accounts and balances
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Payments
            </h2>
            <Link
              href="/payments"
              className="text-sm text-ophir-600 dark:text-ophir-400 hover:text-ophir-700 dark:hover:text-ophir-300 transition-colors font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {mockRecentPayments.map((payment) => {
                  const statusColor = getStatusColor(payment.status);
                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {payment.description}
                        </p>
                        {payment.transactionHash && (
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {shortenAddress(payment.transactionHash)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300 font-mono">
                        {formatAmount(payment.amount, payment.assetCode)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusColor.dot}`}
                          />
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {timeAgo(payment.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickActionButton
            href="/send"
            label="Send Payment"
            icon="💸"
          />
          <QuickActionButton
            href="/batches/new"
            label="Batch Payment"
            icon="📦"
          />
          <QuickActionButton
            href="/requests/new"
            label="Payment Request"
            icon="📄"
          />
          <QuickActionButton
            href="/recurring/new"
            label="Recurring Pay"
            icon="🔄"
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp = false,
}: {
  title: string;
  value: string;
  icon: string;
  trend?: string | React.ReactNode;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {typeof trend === "string" ? (
          <span
            className={`text-xs font-medium ${
              trendUp
                ? "text-green-600 dark:text-green-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {trend}
          </span>
        ) : (
          trend
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
        {value}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{title}</p>
    </div>
  );
}

function AccountRow({
  name,
  publicKey,
  balance,
}: {
  name: string;
  publicKey: string;
  balance: number;
}) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {name}
          </p>
          <p className="text-xs font-mono text-gray-400 mt-0.5">{publicKey}</p>
        </div>
        <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
          {formatAmount(balance)}
        </p>
      </div>
    </div>
  );
}

function QuickActionButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:bg-ophir-50 dark:hover:bg-ophir-950/20 hover:border-ophir-200 dark:hover:border-ophir-800 transition-all duration-200 group"
    >
      <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
        {icon}
      </span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-ophir-700 dark:group-hover:text-ophir-400">
        {label}
      </span>
    </Link>
  );
}
