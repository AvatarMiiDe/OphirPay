import { describe, expect, it } from "vitest";
import { API_KEY_SCOPES } from "@/lib/api-key-scopes";
import { parseApiKeyScopes } from "@/lib/api-auth";

describe("API key scopes", () => {
  it("publishes descriptions for every selectable scope", () => {
    expect(API_KEY_SCOPES).toEqual([
      expect.objectContaining({ id: "read", label: "Read" }),
      expect.objectContaining({ id: "write", label: "Write" }),
      expect.objectContaining({ id: "keys:manage", label: "Manage keys" }),
    ]);
    expect(API_KEY_SCOPES.every((scope) => scope.description.length > 0)).toBe(true);
  });

  it("falls back safely for legacy or malformed stored scope values", () => {
    expect(parseApiKeyScopes(undefined)).toEqual(["read", "write"]);
    expect(parseApiKeyScopes("not-json")).toEqual(["read", "write"]);
    expect(parseApiKeyScopes('["read","write"]')).toEqual(["read", "write"]);
  });
});
