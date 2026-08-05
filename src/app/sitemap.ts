import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ophirpay.vercel.app";

  const pages = [
    { path: "", priority: 1.0 },
    { path: "/send", priority: 0.9 },
    { path: "/payments", priority: 0.8 },
    { path: "/batches", priority: 0.7 },
    { path: "/batches/new", priority: 0.6 },
    { path: "/recurring", priority: 0.7 },
    { path: "/requests", priority: 0.6 },
    { path: "/webhooks", priority: 0.5 },
    { path: "/contracts", priority: 0.7 },
    { path: "/analytics", priority: 0.6 },
    { path: "/events", priority: 0.5 },
  ];

  return pages.map(({ path, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority,
  }));
}
