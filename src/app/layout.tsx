import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OphirPay — Stellar Payment Orchestration",
    template: "%s | OphirPay",
  },
  description:
    "OphirPay is a Stellar-native payment orchestration platform for individuals, businesses, nonprofits, and DAOs.",
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.json",
  openGraph: {
    title: "OphirPay — Stellar Payment Orchestration",
    description: "Open-source payment orchestration layer for Stellar. Send, batch, schedule, and track payments.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
