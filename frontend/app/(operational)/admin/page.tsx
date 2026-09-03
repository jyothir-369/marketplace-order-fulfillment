/**
 * app/(operational)/admin/page.tsx — Admin Dashboard (§4.2).
 *
 * Renders six TelemetryCard tiles for the canonical operational KPIs:
 *   1. Total Orders
 *   2. Revenue
 *   3. Pending
 *   4. Fulfilled
 *   5. Dead-Letter Jobs (danger tone)
 *   6. Ambiguous Jobs (warning tone)
 *
 * Below: Stuck Orders panel from existing /api/admin/orders?type=stuck.
 */

"use client";

import { useEffect, useState } from "react";
import {
  Package,
  DollarSign,
  Clock,
  PackageCheck,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { getAdminDashboard, getAdminOrders } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { TelemetryCard } from "@/components/operational/TelemetryCard";
import { formatCurrency, cn } from "@/lib/utils";
import type { AdminDashboardDto, AdminOrderDto } from "@/lib/types";

function AdminDashboardInner() {
  const { push: toast } = useToast();
  const [dash, setDash] = useState<AdminDashboardDto | null>(null);
  const [stuck, setStuck] = useState<AdminOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashData, stuckData] = await Promise.all([
        getAdminDashboard(),
        getAdminOrders({ type: "stuck", limit: 10 }),
      ]);
      setDash(dashData);
      setStuck(stuckData.orders ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Admin Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height="5.5rem" className="rounded-xl" />
          ))}
        </div>
        <Skeleton height="12rem" className="rounded-xl" />
      </div>
    );
  }

  if (error || !dash) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <div className="rounded-full bg-[var(--color-destructive)]/10 p-3">
          <AlertTriangle className="h-6 w-6 text-[var(--color-destructive)]" aria-hidden />
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">{error ?? "Failed to load dashboard"}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm hover:bg-[var(--color-accent)] text-[var(--color-foreground)]"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Admin Dashboard</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            Real-time operational metrics
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs hover:bg-[var(--color-accent)] text-[var(--color-foreground)]"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
      </div>

      {/* 6-up TelemetryCard grid */}
      <div
        className="grid grid-cols-2 gap-4 md:grid-cols-3"
        role="list"
        aria-label="Operational metrics"
      >
        <TelemetryCard
          label="Total Orders"
          value={dash.totalOrders}
          icon={Package}
          tone="default"
        />
        <TelemetryCard
          label="Revenue"
          value={formatCurrency(dash.totalRevenue)}
          icon={DollarSign}
          tone="default"
        />
        <TelemetryCard
          label="Pending"
          value={dash.pendingOrders}
          icon={Clock}
          tone="warning"
        />
        <TelemetryCard
          label="Fulfilled"
          value={dash.fulfilledOrders}
          icon={PackageCheck}
          tone="success"
        />
        <TelemetryCard
          label="Dead-Letter Jobs"
          value={dash.deadLetterJobs}
          icon={XCircle}
          tone="danger"
        />
        <TelemetryCard
          label="Ambiguous Jobs"
          value={dash.ambiguousJobs}
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      {/* Cancelled summary tile */}
      <div
        className={cn(
          "rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4",
          "flex items-center justify-between shadow-sm"
        )}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
            Cancelled Orders
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
            {dash.cancelledOrders}
          </p>
        </div>
        <div className="rounded-lg p-2 bg-[var(--color-muted)]">
          <XCircle className="h-5 w-5 text-[var(--color-muted-foreground)]" aria-hidden />
        </div>
      </div>

      {/* Stuck orders */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Orders Needing Attention
          </h2>
          <span className="ml-auto rounded-full bg-[var(--color-warning)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-warning)]">
            {stuck.length}
          </span>
        </div>
        {stuck.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-[var(--color-muted-foreground)]">
            <PackageCheck className="h-6 w-6 text-[var(--color-success)]" aria-hidden />
            <p className="text-sm">No stuck orders. System is healthy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-muted)]/40 text-left text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  <th className="px-4 py-2 font-medium">Order ID</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Stuck Reason</th>
                  <th className="px-4 py-2 font-medium">Items</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {stuck.map((o) => (
                  <tr key={o.orderId} className="hover:bg-[var(--color-muted)]/40">
                    <td className="px-4 py-2 font-mono text-xs text-[var(--color-foreground)]">
                      {o.orderId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={o.status} size="sm" />
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--color-warning)]">
                      {o.stuckReason ?? "MANUAL_INTERVENTION_REQUIRED"}
                    </td>
                    <td className="px-4 py-2 text-xs tabular-nums text-[var(--color-foreground)]">
                      {o.lineItems.length}
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return <AdminDashboardInner />;
}
