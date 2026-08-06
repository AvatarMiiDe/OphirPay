import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./mobile-ux.css";
import { AppShell } from "@/components/AppShell";

export { reportWebVitals } from "@/lib/web-vitals";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://ophirpay.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "OphirPay — Stellar Payment Orchestration",
    description: "Open-source payment orchestration layer for Stellar. Send, batch, schedule, and track payments.",
    type: "website",
    siteName: "OphirPay",
  },
  robots: { index: true, follow: true },
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Register service worker for PWA offline support */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(
                    (reg) => console.log('[SW] Registered:', reg.scope),
                    (err) => console.warn('[SW] Registration failed:', err)
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
      >
        {/* Skip-to-content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ophir-600 focus:text-white focus:rounded-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
