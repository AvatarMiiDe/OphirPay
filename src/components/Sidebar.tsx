"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DashboardIcon,
  SendIcon,
  PaymentsIcon,
  BatchesIcon,
  RecurringIcon,
  RequestsIcon,
  WebhookIcon,
  ContractsIcon,
  AnalyticsIcon,
  EventsIcon,
  MenuIcon,
  XIcon,
} from "@/components/ui/Icon";

const navItems = [
  { href: "/", label: "Treasury", Icon: DashboardIcon },
  { href: "/send", label: "Send", Icon: SendIcon },
  { href: "/payments", label: "Payments", Icon: PaymentsIcon },
  { href: "/batches", label: "Batches", Icon: BatchesIcon },
  { href: "/recurring", label: "Recurring", Icon: RecurringIcon },
  { href: "/requests", label: "Requests", Icon: RequestsIcon },
  { href: "/webhooks", label: "Webhooks", Icon: WebhookIcon },
  { href: "/contracts", label: "Contracts", Icon: ContractsIcon },
  { href: "/analytics", label: "Analytics", Icon: AnalyticsIcon },
  { href: "/events", label: "Events", Icon: EventsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = navItems.map((item) => {
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
          isActive
            ? "bg-ophir-50 dark:bg-ophir-950/30 text-ophir-700 dark:text-ophir-400"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white"
        )}
      >
        <span className={cn("transition-colors duration-200", isActive ? "text-ophir-600 dark:text-ophir-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300")}>
          <item.Icon className="w-5 h-5" />
        </span>
        {item.label}
        {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-ophir-500" />}
      </Link>
    );
  });

  const footer = (
    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stellar opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-stellar" />
        </span>
        Stellar Testnet
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">OphirPay v0.1.0</p>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-md"
        aria-label="Toggle menu"
      >
        <div className="w-6 h-6 text-gray-700 dark:text-gray-300">
          {mobileOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </div>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 z-40 flex-col">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-200 dark:border-gray-800">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-ophir-600 to-stellar flex items-center justify-center shadow-lg shadow-ophir-500/30">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-none">OphirPay</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Stellar Payments</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">{links}</nav>
        {footer}
      </aside>

      {/* Mobile sidebar */}
      <aside className={cn(
        "lg:hidden fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 z-40 flex-col transition-transform duration-300",
        mobileOpen ? "translate-x-0 flex" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-200 dark:border-gray-800">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-ophir-600 to-stellar flex items-center justify-center shadow-lg shadow-ophir-500/30">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <div><h1 className="text-lg font-bold text-gray-900 dark:text-white leading-none">OphirPay</h1></div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">{links}</nav>
        {footer}
      </aside>
    </>
  );
}
