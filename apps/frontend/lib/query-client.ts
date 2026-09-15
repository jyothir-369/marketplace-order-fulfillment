/**
 * lib/query-client.ts — TanStack Query configuration with exponential backoff (§3.2).
 *
 * Exponential backoff: base=1 000 ms, factor=2, cap=30 000 ms, maxAttempts=5
 *   ≈ 1s → 2s → 4s → 8s → 16s total backoff window.
 *
 * Usage in app/layout.tsx once @tanstack/react-query is installed:
 *
 *   import { getQueryClient } from "@/lib/query-client";
 *   <QueryClientProvider client={getQueryClient()}>…</QueryClientProvider>
 */

export const QUERY_CLIENT_CONFIG = {
  queries: {
    retry: (failureCount: number, error: unknown) => {
      if (error && typeof error === "object" && "statusCode" in error) {
        const statusCode = (error as { statusCode: number }).statusCode;
        if (statusCode >= 400 && statusCode < 500) return false;
      }
      return failureCount < 5;
    },
    retryDelay: (attemptIndex: number) =>
      Math.min(1_000 * 2 ** attemptIndex, 30_000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5 * 60 * 1_000, // 5 min catalog / order cache (Phase 13)
    gcTime: 10 * 60 * 1_000,
    refetchIntervalInBackground: false,
  },
  mutations: {
    retry: false,
  },
};

/** Lazy singleton — instantiated once @tanstack/react-query is present. */
let _instance: unknown = null;

export function getQueryClient(): unknown {
  if (_instance) return _instance;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { QueryClient } = require("@tanstack/react-query") as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    QueryClient: new (config: unknown) => any;
  };
  _instance = new QueryClient({ defaultOptions: QUERY_CLIENT_CONFIG });
  return _instance;
}

/** Typed alias for consumers that call the singleton directly. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const queryClient: any = new Proxy({}, {
  get(_t, p) {
    return (getQueryClient() as Record<string | symbol, unknown>)[p];
  },
  has(_t, p) {
    return p in (getQueryClient() as object);
  },
});

export default queryClient;
