export const API_KEY_SCOPES = [
  { id: "read", label: "Read", description: "Read payments, balances, and reports." },
  { id: "write", label: "Write", description: "Create and update payments, batches, and requests." },
  { id: "keys:manage", label: "Manage keys", description: "Create and revoke API keys." },
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]["id"];
