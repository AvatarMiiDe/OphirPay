/** Centralized route path constants — prevents hardcoding URLs across the app. */
export const ROUTES = {
  HOME: "/",
  SEND: "/send",
  PAYMENTS: "/payments",
  BATCHES: "/batches",
  NEW_BATCH: "/batches/new",
  RECURRING: "/recurring",
  REQUESTS: "/requests",
  WEBHOOKS: "/webhooks",
  CONTRACTS: "/contracts",
  ANALYTICS: "/analytics",
  EVENTS: "/events",
} as const;

/** API route paths */
export const API_ROUTES = {
  HEALTH: "/api/health",
  PAYMENTS: "/api/payments",
  BATCHES: "/api/batches",
  WEBHOOKS: "/api/webhooks",
  ANALYTICS: "/api/analytics",
  REQUESTS: "/api/requests",
  RECURRING: "/api/recurring",
  KEYS: "/api/keys",
  EVENTS: "/api/events",
  EVENTS_HISTORY: "/api/events/history",
} as const;
