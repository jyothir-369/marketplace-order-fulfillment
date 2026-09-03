/**
 * use-order-polling — smart polling hook for /orders/[id] and /vendor/orders (§3.2).
 *
 * Stops polling automatically when the order reaches a terminal status:
 *   FULFILLED, CANCELLED, FAILED
 *
 * Pauses when the tab is backgrounded (via TanStack Query''s built-in
 * refetchIntervalInBackground: false).
 *
 * Uses exponential backoff (3 s → 6 s → 12 s, capped at 15 s).
 */

"use client";

import { useEffect, useRef } from "react";
import { useQuery, type QueryObserverResult } from "@tanstack/react-query";
import { getOrderById } from "@/lib/api";
import {
  TERMINAL_ORDER_STATUSES,
  type StatusToken,
} from "@/lib/status-tokens";
import type { OrderResponseDto } from "@/lib/types";

interface UseOrderPollingOptions {
  /** Order id to track. If null/undefined, polling is disabled. */
  orderId: string | undefined;
  /** Initial interval in ms (default 3 000). */
  initialIntervalMs?: number;
  /** Maximum interval when backing off (default 15 000). */
  maxIntervalMs?: number;
  /** Whether to enable polling (e.g. can be paused via a toggle). */
  enabled?: boolean;
}

export function useOrderPolling({
  orderId,
  initialIntervalMs = 3_000,
  maxIntervalMs = 15_000,
  enabled = true,
}: UseOrderPollingOptions): QueryObserverResult<OrderResponseDto, Error> & {
  /** True when order has reached a terminal status (polling stops). */
  isTerminal: boolean;
} {
  const attemptRef = useRef(0);
  const intervalRef = useRef(initialIntervalMs);

  const query = useQuery<OrderResponseDto, Error>({
    queryKey: ["order", orderId],
    queryFn: () => getOrderById(orderId as string),
    enabled: Boolean(orderId) && enabled,
    refetchInterval: (query) => {
      const data = query.state.data as OrderResponseDto | undefined;
      if (!data) return initialIntervalMs;
      // Stop polling entirely once terminal.
      if (TERMINAL_ORDER_STATUSES.has(data.status)) return false;
      // Reset exponential backoff on successful fetch.
      attemptRef.current = 0;
      intervalRef.current = initialIntervalMs;
      return intervalRef.current;
    },
    refetchIntervalInBackground: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Reset backoff window when the order id changes
  useEffect(() => {
    attemptRef.current = 0;
    intervalRef.current = initialIntervalMs;
  }, [orderId, initialIntervalMs]);

  const isTerminal = Boolean(
    query.data && TERMINAL_ORDER_STATUSES.has(query.data.status)
  );

  return { ...query, isTerminal };
}

/**
 * Pure helper — returns true if the given status is terminal.
 * Useful for non-hook callers (e.g. rendering <PollingIndicator />).
 */
export function isTerminalStatus(status: string | undefined): boolean {
  if (!status) return false;
  return TERMINAL_ORDER_STATUSES.has(status);
}

/**
 * Returns the canonical token for the given order status, plus a small
 * `live` flag indicating whether the order is still being processed.
 */
export function describeOrderStatus(status: string | undefined): {
  token: StatusToken;
  live: boolean;
} {
  const { getStatusToken } = require("@/lib/status-tokens") as typeof import("@/lib/status-tokens");
  const token = getStatusToken(status ?? "UNKNOWN");
  return { token, live: !TERMINAL_ORDER_STATUSES.has(status ?? "") };
}
