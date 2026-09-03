"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, X } from "lucide-react";
import { getAdminOrders } from "@/lib/api";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { ResolveLineItemDialog } from "@/components/admin/resolve-line-item-dialog";
import type { AdminOrderDto, AdminOrderLineItemDto } from "@/lib/types";

const STATUS_FILTERS = ["all", "PLACED", "CONFIRMED", "FULFILLING", "FULFILLED", "CANCELLED", "FAILED"];

function AdminOrdersInner() {
  const { push: toast } = useToast();
  const [orders, setOrders] = useState<AdminOrderDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [stuckFilter, setStuckFilter] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<{ lineItemId: string; orderId: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAdminOrders({
        status: statusFilter === "all" ? undefined : statusFilter,
        type: stuckFilter ? "stuck" : "all",
        limit: 50,
      });
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [statusFilter, stuckFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">All Orders</h1>
        <p className="text-sm text-text-muted">{total} total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated p-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={["rounded px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === s
                  ? "bg-accent-primary text-white"
                  : "bg-surface-base border border-border text-text-muted hover:bg-surface-hover"
              ].join(" ")}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={stuckFilter}
            onChange={e => setStuckFilter(e.target.checked)}
            className="accent-accent-primary"
          />
          Stuck only
        </label>
        <button
          onClick={() => void load()}
          className="flex items-center gap-1 rounded border border-border px-3 py-1 text-xs hover:bg-surface-base"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-surface-elevated shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6 text-text-muted" aria-hidden />
            <p className="text-sm text-text-muted">No orders match the current filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-base text-xs text-text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Order ID</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Items</th>
                <th className="px-4 py-2 text-left font-medium">Created</th>
                <th className="px-4 py-2 text-left font-medium">Stuck</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map(order => (
                <>
                  <tr key={order.orderId} className="hover:bg-surface-base transition-colors">
                    <td className="px-4 py-2 font-mono text-xs">{order.orderId}</td>
                    <td className="px-4 py-2"><StatusBadge status={order.status} size="sm" /></td>
                    <td className="px-4 py-2">{order.lineItems.length}</td>
                    <td className="px-4 py-2 text-text-muted">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      {order.stuckReason ? (
                        <span className="inline-flex items-center gap-1 text-xs text-alert-warning">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          {order.stuckReason}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setExpanded(expanded === order.orderId ? null : order.orderId)}
                        className="rounded p-1 hover:bg-surface-hover"
                        aria-label={expanded === order.orderId ? "Collapse" : "Expand"}
                      >
                        {expanded === order.orderId
                          ? <ChevronUp className="h-4 w-4" aria-hidden />
                          : <ChevronDown className="h-4 w-4" aria-hidden />
                        }
                      </button>
                    </td>
                  </tr>
                  {expanded === order.orderId && (
                    <tr>
                      <td colSpan={6} className="bg-surface-base px-6 py-3">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Line Items</p>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-text-muted">
                                <th className="pb-1 text-left font-medium">Item ID</th>
                                <th className="pb-1 text-left font-medium">Status</th>
                                <th className="pb-1 text-left font-medium">Attempts</th>
                                <th className="pb-1 text-left font-medium">Failure Reason</th>
                                <th className="pb-1 text-right font-medium">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {order.lineItems.map((li: AdminOrderLineItemDto) => (
                                <tr key={li.lineItemId} className="hover:bg-surface-elevated">
                                  <td className="py-1 font-mono">{li.lineItemId}</td>
                                  <td className="py-1"><StatusBadge status={li.fulfillmentStatus} size="sm" /></td>
                                  <td className="py-1 text-text-muted">{li.attempts}</td>
                                  <td className="py-1 text-alert-error">{li.failureReason ?? <span className="text-text-muted">—</span>}</td>
                                  <td className="py-1 text-right">
                                    <button
                                      onClick={() => setResolveTarget({ lineItemId: li.lineItemId, orderId: order.orderId })}
                                      className="rounded border border-accent-primary px-2 py-0.5 text-xs text-accent-primary hover:bg-accent-primary/10"
                                    >
                                      Resolve
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {resolveTarget && (
        <ResolveLineItemDialog
          lineItemId={resolveTarget.lineItemId}
          orderId={resolveTarget.orderId}
          onClose={() => setResolveTarget(null)}
          onResolved={() => {
            setResolveTarget(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <ToastProvider>
      <AdminOrdersInner />
    </ToastProvider>
  );
}