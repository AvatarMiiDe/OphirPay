// OphirPay Service Worker
// Placeholder for offline support and caching.
// In production, use next-pwa or workbox for full PWA capabilities.

const CACHE_NAME = "ophirpay-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass through all requests for now
  event.respondWith(fetch(event.request));
});
