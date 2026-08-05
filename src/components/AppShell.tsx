"use client";

import { WalletProvider } from "@/hooks/useFreighter";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/hooks/useTheme";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { OfflineBanner } from "@/components/OfflineBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <WalletProvider>
        <ToastProvider>
          <OfflineBanner />
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 lg:ml-64">
              <Header />
              <main id="main-content" className="p-4 md:p-6">{children}</main>
            </div>
          </div>
        </ToastProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
