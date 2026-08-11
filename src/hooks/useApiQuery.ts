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

/**
 * Fetch wrapper that throws structured ApiError on non-2xx responses.
 */
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

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
 */
export function useApiQuery<T>(
  key: string[],
  url: string,
  options?: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">,
) {
  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: () => apiFetch<T>(url),
    ...options,
  });
}

/**
 * Shared POST mutation hook.
 */
export function useApiMutation<TBody, TResponse>(url: string) {
  const queryClient = useQueryClient();

  return useMutation<TResponse, ApiError, TBody>({
    mutationFn: (body) =>
      apiFetch<TResponse>(url, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      // Invalidate all queries to refresh data after mutation
      queryClient.invalidateQueries();
    },
  });
}

export { apiFetch };
