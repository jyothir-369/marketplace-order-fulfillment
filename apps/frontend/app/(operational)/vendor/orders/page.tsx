"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RefreshCw } from "lucide-react";
import {
  Order,
  VENDOR_ID,
  getVendorOrders,
  transitionOrder,
} from "@/lib/api";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PollingIndicator } from "@/components/order/PollingIndicator";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 5000;
const TERMINAL_ORDER_STATUSES = new Set<string>(["FULFILLED", "CANCELLED", "FAILED", "DEAD_LETTER"]);

function VendorOrdersInner() {
  const { push: toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getVendorOrders(VENDOR_ID);
      setOrders(data);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load orders";
      setErrorBanner(msg);
    }
  }, []);

  useEffect(() => {
    void fetchOrders().finally(() => setLoading(false));
  }, [fetchOrders]);

  const hasNonTerminal = useMemo(
    () => orders.some((o) => !TERMINAL_ORDER_STATUSES.has(o.status)),
    [orders]
  );

  useEffect(() => {
    if (!autoRefresh || !hasNonTerminal) return;
    const id = setInterval(() => void fetchOrders(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, hasNonTerminal, fetchOrders]);

  const performTransition = async (
    orderId: string,
    action: "CONFIRM" | "FULFILL" | "SHIP" | "CANCEL",
    label: string
  ) => {
    setActingId(orderId);
    setErrorBanner(null);
    try {
      await transitionOrder(orderId, { action });
      toast(label + " succeeded", "success");
      await fetchOrders();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed";
      setErrorBanner(msg);
      toast(msg, "error");
    } finally {
      setActingId(null);
    }
  };

  const nonTerminalCount = orders.filter(
    (o) => !TERMINAL_ORDER_STATUSES.has(o.status)
  ).length;
  const terminalCount = orders.length - nonTerminalCount;

  function actionsFor(status: string): {
    action: "CONFIRM" | "FULFILL" | "SHIP" | "CANCEL";
    label: string;
  }[] {
    switch (status) {
      case "PLACED":
        return [
          { action: "CONFIRM", label: "Confirm" },
          { action: "CANCEL", label: "Cancel" },
        ];
      case "CONFIRMED":
        return [
          { action: "FULFILL", label: "Mark Fulfilling" },
          { action: "CANCEL", label: "Cancel" },
        ];
      case "FULFILLING":
        return [{ action: "SHIP", label: "Ship Order" }];
      default:
        return [];
    }
  }

  const btnBase =
    "px-2.5 py-1 rounded text-xs font-medium disabled:opacity-50 inline-flex items-center justify-center gap-1";

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Orders</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            {loading
              ? "Loading..."
              : `${orders.length} total · ${nonTerminalCount} active · ${terminalCount} terminal`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && autoRefresh && hasNonTerminal && (
            <PollingIndicator isPolling={true} lastUpdated={lastUpdated} />
          )}
          <button
            type="button"
            onClick={() => void fetchOrders()}
            className={cn(
              btnBase,
              "border border-[var(--color-border)] bg-[var(--color-card)]",
              "text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
            )}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={cn(
              btnBase,
              autoRefresh
                ? "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/30"
                : "bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-muted-foreground)]"
            )}
          >
            {autoRefresh ? (
              <><Pause className="h-3 w-3" aria-hidden /> Pause</>
            ) : (
              <><Play className="h-3 w-3" aria-hidden /> Resume</>
            )}
          </button>
        </div>
      </header>

      {errorBanner && (
        <div
          className={cn(
            "flex items-start justify-between gap-3 rounded border p-3 text-sm",
            "border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5",
            "text-[var(--color-destructive)]"
          )}
        >
          <span>{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="font-bold hover:opacity-80 shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div
        className={cn(
          "overflow-hidden rounded-xl border",
          "border-[var(--color-border)] bg-[var(--color-card)] shadow-sm"
        )}
      >
        <table className="w-full text-sm">
          <thead
            className={cn(
              "border-b border-[var(--color-border)]",
              "bg-[var(--color-muted)]/40"
            )}
          >
            <tr>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider w-24 text-[var(--color-muted-foreground)]">
                Order
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Items
              </th>
              <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider w-20 text-[var(--color-muted-foreground)]">
                Total
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider w-40 text-[var(--color-muted-foreground)]">
                Created
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider w-28 text-[var(--color-muted-foreground)]">
                Status
              </th>
              <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider w-40 text-[var(--color-muted-foreground)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={"sk-" + i}>
                  <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="p-3"><Skeleton className="h-6 w-32 ml-auto" /></td>
                </tr>
              ))}

            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="No orders yet"
                    description="Orders for this vendor will appear here once placed."
                  />
                </td>
              </tr>
            )}

            {!loading &&
              orders.map((order) => {
                const actions = actionsFor(order.status);
                const isTerminal = TERMINAL_ORDER_STATUSES.has(order.status);
                const vendorItems = order.lineItems.filter(
                  (li) => li.vendorId === VENDOR_ID
                );
                return (
                  <tr
                    key={order.id}
                    className="hover:bg-[var(--color-muted)]/40"
                  >
                    <td className="p-3 font-mono text-xs text-[var(--color-muted-foreground)]">
                      {order.id.slice(0, 8)}
                    </td>
                    <td className="p-3">
                      <ul className="space-y-0.5 text-xs text-[var(--color-foreground)]">
                        {vendorItems.map((li) => (
                          <li key={li.id}>
                            {li.quantity}× {li.productName}
                          </li>
                        ))}
                        {vendorItems.length === 0 && (
                          <li className="italic text-[var(--color-muted-foreground)]">
                            No items for this vendor
                          </li>
                        )}
                      </ul>
                    </td>
                    <td className="p-3 text-right tabular-nums text-[var(--color-foreground)]">
                      {order.totalAmount.toFixed(2)}
                    </td>
                    <td className="p-3 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={order.status} size="sm" />
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {isTerminal ? (
                        <span className="text-xs italic text-[var(--color-muted-foreground)]">
                          No actions
                        </span>
                      ) : actions.length === 0 ? (
                        <span className="text-xs italic text-[var(--color-muted-foreground)]">
                          No actions
                        </span>
                      ) : (
                        <div className="flex justify-end gap-1 flex-wrap">
                          {actions.map((a) => (
                            <button
                              key={a.action}
                              type="button"
                              disabled={actingId === order.id}
                              onClick={() =>
                                void performTransition(order.id, a.action, a.label)
                              }
                              className={cn(
                                btnBase,
                                "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
                                "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                              )}
                            >
                              {actingId === order.id ? "..." : a.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!autoRefresh && (
        <p
          className={cn(
            "inline-flex items-center gap-1.5 rounded p-2 text-xs",
            "bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30",
            "text-[var(--color-warning)]"
          )}
        >
          <Pause className="h-3 w-3" aria-hidden />
          Live updates paused. Polling will resume when you toggle it back on.
        </p>
      )}
    </div>
  );
}

export default function VendorOrdersPage() {
  return (
    <ToastProvider>
      <VendorOrdersInner />
    </ToastProvider>
  );
}
