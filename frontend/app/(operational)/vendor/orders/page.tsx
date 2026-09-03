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
  const [statusFilter, setStatusFilter] = useState<"all" | "non-terminal">("all");

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

  // Exclude terminal orders from polled diff-sets: stop polling if all are terminal.
  const hasNonTerminal = useMemo(
    () => orders.some((o) => !TERMINAL_ORDER_STATUSES.has(o.status)),
    [orders]
  );

  useEffect(() => {
    if (!autoRefresh || !hasNonTerminal) return;
    const id = setInterval(() => void fetchOrders(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, hasNonTerminal, fetchOrders]);

  const performTransition = async (orderId: string, action: "CONFIRM" | "FULFILL" | "SHIP" | "CANCEL", label: string) => {
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

  const filtered = useMemo(() => {
    if (statusFilter === "non-terminal") return orders.filter((o) => !TERMINAL_ORDER_STATUSES.has(o.status));
    return orders;
  }, [orders, statusFilter]);

  const nonTerminalCount = orders.filter((o) => !TERMINAL_ORDER_STATUSES.has(o.status)).length;
  const terminalCount = orders.length - nonTerminalCount;

  // Actions for a given order status
  function actionsFor(status: string): { action: "CONFIRM" | "FULFILL" | "SHIP" | "CANCEL"; label: string; className: string }[] {
    switch (status) {
      case "PLACED":
        return [
          { action: "CONFIRM", label: "Confirm", className: "bg-blue-600 text-white hover:bg-blue-700" },
          { action: "CANCEL", label: "Cancel", className: "bg-red-600 text-white hover:bg-red-700" },
        ];
      case "CONFIRMED":
        return [
          { action: "FULFILL", label: "Mark Fulfilling", className: "bg-amber-600 text-white hover:bg-amber-700" },
          { action: "CANCEL", label: "Cancel", className: "bg-red-600 text-white hover:bg-red-700" },
        ];
      case "FULFILLING":
        return [
          { action: "SHIP", label: "Ship Order", className: "bg-emerald-600 text-white hover:bg-emerald-700" },
        ];
      default:
        return [];
    }
  }

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Orders</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading ? "Loading..." : orders.length + " total · " + nonTerminalCount + " active · " + terminalCount + " terminal"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && autoRefresh && hasNonTerminal && (
            <PollingIndicator isPolling={true} lastUpdated={lastUpdated} />
          )}
          <button type="button" onClick={() => void fetchOrders()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-zinc-300 rounded hover:bg-zinc-50"><RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh</button>
          <button type="button" onClick={() => setAutoRefresh((v) => !v)} className={["inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded font-medium", autoRefresh ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"].join(" ")} aria-pressed={!autoRefresh} aria-label={autoRefresh ? "Pause live updates" : "Resume live updates"}>
            {autoRefresh ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
            {autoRefresh ? "Pause" : "Resume"} Live Updates
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "non-terminal")} className="border border-zinc-300 rounded px-2 py-1 text-sm">
          <option value="all">All orders</option>
          <option value="non-terminal">Active only (excluding terminal)</option>
        </select>
      </div>

      {errorBanner && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm flex items-start justify-between gap-3">
          <span>{errorBanner}</span>
          <button type="button" onClick={() => setErrorBanner(null)} className="text-red-700 hover:text-red-900 font-bold" aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="p-3 text-left font-semibold text-zinc-700 text-xs uppercase tracking-wide w-24">Order</th>
              <th className="p-3 text-left font-semibold text-zinc-700 text-xs uppercase tracking-wide">Items</th>
              <th className="p-3 text-right font-semibold text-zinc-700 text-xs uppercase tracking-wide w-20">Total</th>
              <th className="p-3 text-left font-semibold text-zinc-700 text-xs uppercase tracking-wide w-40">Created</th>
              <th className="p-3 text-left font-semibold text-zinc-700 text-xs uppercase tracking-wide w-28">Status</th>
              <th className="p-3 text-right font-semibold text-zinc-700 text-xs uppercase tracking-wide w-40">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && Array.from({ length: 4 }).map((_, i) => (
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
              <tr><td colSpan={6}><EmptyState title="No orders yet" description="Orders for this vendor will appear here once placed." /></td></tr>
            )}

            {!loading && filtered.length === 0 && orders.length > 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-sm text-zinc-500">No orders match this filter.</td></tr>
            )}

            {!loading && filtered.map((order) => {
              const actions = actionsFor(order.status);
              const isTerminal = TERMINAL_ORDER_STATUSES.has(order.status);
              const vendorItems = order.lineItems.filter((li) => li.vendorId === VENDOR_ID);
              return (
                <tr key={order.id} className="hover:bg-zinc-50">
                  <td className="p-3 font-mono text-xs text-zinc-500">{order.id.slice(0, 8)}</td>
                  <td className="p-3">
                    <ul className="space-y-0.5 text-xs">
                      {vendorItems.map((li) => (
                        <li key={li.id}>{li.quantity}× {li.productName}</li>
                      ))}
                      {vendorItems.length === 0 && <li className="italic text-zinc-400">No items for this vendor</li>}
                    </ul>
                  </td>
                  <td className="p-3 text-right"></td>
                  <td className="p-3 text-xs text-zinc-600">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="p-3"><StatusBadge status={order.status} size="sm" /></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {isTerminal ? (
                      <span className="text-xs text-zinc-400 italic">No actions</span>
                    ) : actions.length === 0 ? (
                      <span className="text-xs text-zinc-400 italic">No actions</span>
                    ) : (
                      <div className="flex justify-end gap-1 flex-wrap">
                        {actions.map((a) => (
                          <button key={a.action} type="button" disabled={actingId === order.id} onClick={() => void performTransition(order.id, a.action, a.label)} className={["px-2.5 py-1 rounded text-xs font-medium disabled:opacity-50", a.className].join(" ")}>{actingId === order.id ? "..." : a.label}</button>
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
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 inline-flex items-center gap-1.5">
          <Pause className="h-3 w-3" aria-hidden /> Live updates paused. Polling will resume when you toggle it back on.
        </p>
      )}
    </div>
  );
}

export default function VendorOrdersPage() {
  return <ToastProvider><VendorOrdersInner /></ToastProvider>;
}