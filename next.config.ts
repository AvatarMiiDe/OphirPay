import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// In production: strict CSP — no unsafe-inline, no unsafe-eval.
// Next.js bundles all scripts in production mode, so inline scripts
// are not required. Only wasm-unsafe-eval is needed for Stellar SDK.
// In development: allow unsafe-inline/eval for HMR and Fast Refresh.
const scriptSrc = isProd
  ? "'self' 'wasm-unsafe-eval'"
  : "'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'";

const cspHeader = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  // Horizon + Soroban RPC + Stellar Expert
  "connect-src 'self' https://horizon-testnet.stellar.org https://horizon.stellar.org https://soroban-testnet.stellar.org https://soroban.stellar.org https://rpc-futurenet.stellar.org https://mainnet.soroban.rpc.pulse.so",
  "img-src 'self' data: https://stellar.expert https://raw.githubusercontent.com",
  "font-src 'self'",
  "frame-src 'self' https://*.freighter.app chrome-extension: moz-extension:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Standalone output — required by the Docker image (copies .next/standalone)
  output: "standalone",

  // Enable instrumentation hook for startup bootstrap
  instrumentationHook: true,

  // Power web vitals with edge performance metrics
  poweredByHeader: false,

  // Compress responses for better performance
  compress: true,

  // Production source maps disabled for security
  productionBrowserSourceMaps: false,

  // Security headers applied to all responses
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "0" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Content-Security-Policy", value: cspHeader },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      ],
    },
    {
      source: "/api/(.*)",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
      ],
    },
  ],

  // Image optimization for Stellar Explorer and other external sources
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "stellar.expert" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
