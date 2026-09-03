/**
 * app/(operational)/admin/page.tsx — Admin Dashboard (§4.2).
 *
 * Renders six TelemetryCard tiles + two Recharts charts:
 *   - FulfillmentMetricsChart  (area chart: throughput over time)
 *   - VendorQueueLatencyChart  (bar chart: per-vendor latency)
 *
 * The page is wrapped with ErrorBoundary so chart render failures are isolated.
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
import { FulfillmentMetricsChart, type FulfillmentDataPoint } from "@/components/operational/FulfillmentMetricsChart";
import { VendorQueueLatencyChart, type VendorLatencyPoint } from "@/components/operational/VendorQueueLatencyChart";
import { ErrorBoundary } from "@/components/operational/ErrorBoundary";
import { formatCurrency, cn } from "@/lib/utils";
import type { AdminDashboardDto, AdminOrderDto } from "@/lib/types";

function AdminDashboardInner() {
  const { push: toast } = useToast();
  const [dash, setDash] = useState<AdminDashboardDto | null>(null);
  const [stuck, setStuck] = useState<AdminOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock throughput data — in production, derive from an API endpoint.
  // Shape: { date, placed, fulfilling, fulfilled, deadLetter }
  const [throughputData, setThroughputData] = useState<FulfillmentDataPoint[]>([]);
  // Mock vendor latency data — in production, derive from an API endpoint.
  const [latencyData, setLatencyData] = useState<VendorLatencyPoint[]>([]);

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

      // Build mock throughput from dashboard deltas (replace with real API when available).
      const today = new Date();
      const mockThroughput: FulfillmentDataPoint[] = [
        { date: formatDate(addDays(today, -6)), placed: 12, fulfilling: 4, fulfilled: 8, deadLetter: 0 },
        { date: formatDate(addDays(today, -5)), placed: 18, fulfilling: 6, fulfilled: 11, deadLetter: 1 },
        { date: formatDate(addDays(today, -4)), placed: 9,  fulfilling: 3, fulfilled: 5, deadLetter: 1 },
        { date: formatDate(addDays(today, -3)), placed: 22, fulfilling: 8, fulfilled: 13, deadLetter: 0 },
        { date: formatDate(addDays(today, -2)), placed: 15, fulfilling: 5, fulfilled: 10, deadLetter: 0 },
        { date: formatDate(addDays(today, -1)), placed: 20, fulfilling: 7, fulfilled: 12, deadLetter: 1 },
        { date: formatDate(today), placed: dashData.totalOrders, fulfilling: dashData.pendingOrders, fulfilled: dashData.fulfilledOrders, deadLetter: dashData.deadLetterJobs },
      ];
      setThroughputData(mockThroughput);

      // Mock vendor latency (replace with real API when available).
      const mockLatency: VendorLatencyPoint[] = [
        { vendorId: "v-001", vendorName: "Acme Supplies",   latencyMs: 420 },
        { vendorId: "v-002", vendorName: "FastShip Co.",    latencyMs: 890 },
        { vendorId: "v-003", vendorName: "Global Goods",    latencyMs: 1200 },
        { vendorId: "v-004", vendorName: "Prime Vendors",   latencyMs: 2100 },
        { vendorId: "v-005", vendorName: "Budget Parts",   latencyMs: 6800 },
      ];
      setLatencyData(mockLatency);
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton height="18rem" className="rounded-xl" />
          <Skeleton height="18rem" className="rounded-xl" />
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
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm",
            "border-[var(--color-border)] bg-[var(--color-card)]",
            "text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Retry
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
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm",
            "border-[var(--color-border)] bg-[var(--color-card)]",
            "text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
        </button>
      </div>

      {/* 6-up TelemetryCard grid */}
      <div
        className="grid grid-cols-2 gap-4 md:grid-cols-3"
        role="list"
        aria-label="Operational metrics"
      >
        <TelemetryCard label="Total Orders" value={dash.totalOrders} icon={Package} tone="default" />
        <TelemetryCard label="Revenue" value={formatCurrency(dash.totalRevenue)} icon={DollarSign} tone="default" />
        <TelemetryCard label="Pending" value={dash.pendingOrders} icon={Clock} tone="warning" />
        <TelemetryCard label="Fulfilled" value={dash.fulfilledOrders} icon={PackageCheck} tone="success" />
        <TelemetryCard label="Dead-Letter Jobs" value={dash.deadLetterJobs} icon={XCircle} tone="danger" />
        <TelemetryCard label="Ambiguous Jobs" value={dash.ambiguousJobs} icon={AlertTriangle} tone="warning" />
      </div>

      {/* Charts — wrapped in ErrorBoundary so a crash in one chart doesn't blank the whole page */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ErrorBoundary label="Fulfillment throughput chart">
          <FulfillmentMetricsChart data={throughputData} height={240} />
        </ErrorBoundary>

        <ErrorBoundary label="Vendor latency chart">
          <VendorQueueLatencyChart data={latencyData} height={240} />
        </ErrorBoundary>
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
        <div className="rounded-lg bg-[var(--color-muted)] p-2">
          <XCircle className="h-5 w-5 text-[var(--color-muted-foreground)]" aria-hidden />
        </div>
      </div>

      {/* Stuck orders */}
      <div
        className={cn(
          "rounded-xl border bg-[var(--color-card)] shadow-sm",
          "border-[var(--color-border)]"
        )}
      >
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

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export default function AdminDashboardPage() {
  return <AdminDashboardInner />;
}
