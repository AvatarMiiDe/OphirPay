"use client";
// SPDX-License-Identifier: MIT

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";

/**
 * Shared API error type for typed error handling.
 */
export interface ApiError {
  code: string;
  message: string;
}

// ── CSRF token (double-submit cookie pattern) ───────────────────
//
// Mutation API routes verify a `x-csrf-token` header against the
// `__Host-csrf` cookie. The cookie is HttpOnly (not readable by JS),
// so the token is minted server-side at GET /api/csrf, which sets the
// cookie AND returns the token in the body. We cache it in memory and
// attach it to every non-GET request. `undefined` = not fetched yet.

let csrfTokenCache: string | null | undefined;

async function getCsrfToken(): Promise<string | null> {
  if (csrfTokenCache !== undefined) return csrfTokenCache;
  try {
    const res = await fetch("/api/csrf", { method: "GET" });
    if (res.ok) {
      const json = (await res.json()) as { token?: string };
      csrfTokenCache = json.token ?? null;
    } else {
      csrfTokenCache = null;
    }
  } catch {
    csrfTokenCache = null;
  }
  return csrfTokenCache;
}

/**
 * Fetch wrapper that throws structured ApiError on non-2xx responses.
 * Automatically attaches the CSRF token to mutation requests.
 */
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (isMutation) {
    const token = await getCsrfToken();
    if (token) headers.set("x-csrf-token", token);
  }

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: ApiError = {
      code: body?.error?.code ?? `HTTP_${res.status}`,
      message: body?.error?.message ?? `Request failed with status ${res.status}`,
    };
    throw err;
  }

  const json = await res.json();
  return json.data ?? json;
}

/**
 * Shared GET query hook wrapping React Query's useQuery.
 *
 * Pass an optional `queryFn` to read from a non-REST source (e.g. on-chain
 * contract reads via Soroban simulation) while keeping the same cache
 * key/invalidation semantics.
 */
export function useApiQuery<T>(
  key: string[],
  url?: string,
  options?: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">,
  queryFn?: () => Promise<T>,
) {
  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: queryFn ?? (() => apiFetch<T>(url ?? "")),
    ...options,
  });
}

export interface ApiMutationOptions {
  /** HTTP method to use. Defaults to POST. */
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  /**
   * Query keys to invalidate on success. Defaults to ALL queries.
   * Scope this to the mutation's own lists so unrelated (and potentially
   * expensive, e.g. on-chain simulation) queries are not refetched.
   */
  invalidateKeys?: string[][];
}

/**
 * Shared mutation hook. POST by default; pass `method` for DELETE/PUT/PATCH.
 * `url` may be a static string or a function of the mutation body, which is
 * useful for DELETE/PATCH routes that identify the resource in the query
 * string or path (e.g. `/api/webhooks?id=${body.id}`).
 * Automatically invalidates cached queries on success so data refreshes.
 */
export function useApiMutation<TBody, TResponse>(
  url: string | ((body: TBody) => string),
  options?: ApiMutationOptions,
) {
  const queryClient = useQueryClient();
  const method = options?.method ?? "POST";

  return useMutation<TResponse, ApiError, TBody>({
    mutationFn: (body) => {
      const resolvedUrl = typeof url === "function" ? url(body) : url;
      return apiFetch<TResponse>(resolvedUrl, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    },
    onSuccess: () => {
      const keys = options?.invalidateKeys;
      if (keys && keys.length > 0) {
        for (const key of keys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      } else {
        queryClient.invalidateQueries();
      }
    },
  });
}

export { apiFetch };
