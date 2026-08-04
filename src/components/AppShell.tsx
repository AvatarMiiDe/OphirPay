"use client";

import { WalletProvider } from "@/hooks/useFreighter";
import { ToastProvider } from "@/components/ui/Toast";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <ToastProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 lg:ml-64">
            <Header />
            <main className="p-4 md:p-6">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </WalletProvider>
  );
}
