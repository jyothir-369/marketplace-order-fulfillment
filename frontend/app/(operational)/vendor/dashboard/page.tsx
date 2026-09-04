
/**
 * app/(operational)/vendor/dashboard/page.tsx - Vendor Portal Dashboard (§6).
 *
 * Aggregates:
 *   - Pending fulfillment jobs (sync jobs in pending / in_progress)
 *   - Stock counts (total, low, out-of-stock) + active vs inactive products
 *   - Vendor sync status summary (pending/dead-letter/ambiguous counts)
 *   - Open orders count for the vendor
 *
 * Reuses TelemetryCard for at-a-glance metrics, then renders dense tables
 * for drill-down. Refresh is manual (operational dashboard, not real-time).
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Inbox,
  Package,
  PackageCheck,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import { VENDOR_ID, getVendorDashboard } from "@/lib/api";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { TelemetryCard } from "@/components/operational/TelemetryCard";
import { cn } from "@/lib/utils";
import type { VendorDashboardDto } from "@/lib/types";

function VendorDashboardInner() {
  const { push: toast } = useToast();
  const [data, setData] = useState<VendorDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getVendorDashboard(VENDOR_ID);
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load vendor dashboard";
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
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Vendor Dashboard</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            Operational summary of pending fulfillment jobs, stock levels, and sync status.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height="5.5rem" className="rounded-xl" />
          ))}
        </div>
        <Skeleton height="14rem" className="rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Vendor Dashboard</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            Operational summary of pending fulfillment jobs, stock levels, and sync status.
          </p>
        </div>
        <div
          role="alert"
          className="rounded-md border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] p-4 text-sm font-medium"
        >
          {error ?? "No dashboard data available."}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm",
            "border border-[var(--color-border)] bg-[var(--color-card)]",
            "text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Retry
        </button>
      </div>
    );
  }

  const stockHealth =
    data.outOfStockCount === 0 && data.lowStockCount === 0
      ? "success"
      : data.outOfStockCount > 0
        ? "danger"
        : "warning";

  const syncHealth =
    data.deadLetterJobs > 0
      ? "danger"
      : data.ambiguousJobs > 0
        ? "warning"
        : "success";

  const cards = [
    { label: "Products", value: data.productCount, icon: Package, tone: "default" as const, trend: data.activeProductCount + " active" },
    { label: "Total Stock", value: data.totalStock, icon: PackageCheck, tone: "success" as const },
    { label: "Low Stock", value: data.lowStockCount, icon: Clock, tone: data.lowStockCount > 0 ? ("warning" as const) : ("default" as const) },
    { label: "Out of Stock", value: data.outOfStockCount, icon: XCircle, tone: data.outOfStockCount > 0 ? ("danger" as const) : ("default" as const) },
    { label: "Open Orders", value: data.openOrders, icon: Truck, tone: data.openOrders > 0 ? ("warning" as const) : ("default" as const) },
    { label: "Pending Sync Jobs", value: data.pendingSyncJobs, icon: Inbox, tone: data.pendingSyncJobs > 0 ? ("warning" as const) : ("default" as const) },
    { label: "Dead-Letter Jobs", value: data.deadLetterJobs, icon: AlertTriangle, tone: data.deadLetterJobs > 0 ? ("danger" as const) : ("default" as const) },
    { label: "Ambiguous Jobs", value: data.ambiguousJobs, icon: AlertTriangle, tone: data.ambiguousJobs > 0 ? ("warning" as const) : ("default" as const) },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Vendor Dashboard</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            Operational summary for <span className="font-mono">{data.vendorName}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm",
            "border border-[var(--color-border)] bg-[var(--color-card)]",
            "text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <TelemetryCard key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} trend={c.trend} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={cn("rounded-xl border bg-[var(--color-card)] p-4 shadow-sm","border-[var(--color-border)]")}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">Stock Health</h2>
          <p className={cn("mt-2 text-2xl font-bold tabular-nums",stockHealth === "success" && "text-[var(--color-success)]",stockHealth === "warning" && "text-[var(--color-warning)]",stockHealth === "danger" && "text-[var(--color-destructive)]")}>
            {stockHealth === "success" ? "Healthy" : stockHealth === "warning" ? "Attention" : "Critical"}
          </p>
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            {data.outOfStockCount} out of stock, {data.lowStockCount} low stock.
          </p>
          <Link href="/vendor/inventory" className="mt-3 inline-block text-xs font-medium text-[var(--color-info)] hover:underline">Manage inventory</Link>
        </div>

        <div className={cn("rounded-xl border bg-[var(--color-card)] p-4 shadow-sm","border-[var(--color-border)]")}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">Sync Status</h2>
          <p className={cn("mt-2 text-2xl font-bold tabular-nums",syncHealth === "success" && "text-[var(--color-success)]",syncHealth === "warning" && "text-[var(--color-warning)]",syncHealth === "danger" && "text-[var(--color-destructive)]")}>
            {syncHealth === "success" ? "All clear" : syncHealth === "warning" ? "Review" : "Action needed"}
          </p>
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            {data.pendingSyncJobs} pending, {data.ambiguousJobs} ambiguous, {data.deadLetterJobs} dead-letter.
          </p>
          <Link href="/vendor/dead-letter" className="mt-3 inline-block text-xs font-medium text-[var(--color-info)] hover:underline">Inspect dead-letter queue</Link>
        </div>

        <div className={cn("rounded-xl border bg-[var(--color-card)] p-4 shadow-sm","border-[var(--color-border)]")}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">Open Orders</h2>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--color-foreground)]">{data.openOrders}</p>
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">Non-terminal orders awaiting confirmation, fulfillment, or shipping.</p>
          <Link href="/vendor/orders" className="mt-3 inline-block text-xs font-medium text-[var(--color-info)] hover:underline">View orders</Link>
        </div>
      </div>

      <div className={cn("rounded-xl border bg-[var(--color-card)] shadow-sm","border-[var(--color-border)]")}>
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <Package className="h-4 w-4 text-[var(--color-muted-foreground)]" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Operational Snapshot</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-muted)]/40 text-left text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                <th className="px-4 py-2 font-medium">Metric</th>
                <th className="px-4 py-2 font-medium">Value</th>
                <th className="px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {([
                ["Total Products", data.productCount, data.activeProductCount + " active"],
                ["Total Stock Units", data.totalStock, "Sum of stockCount across all SKUs"],
                ["Low Stock Items", data.lowStockCount, "Stock between 1 and 5 inclusive"],
                ["Out of Stock Items", data.outOfStockCount, "Stock equals 0"],
                ["Open Orders", data.openOrders, "Pending, syncing, confirmed, or ambiguous"],
                ["Pending Sync Jobs", data.pendingSyncJobs, "PENDING + IN_PROGRESS"],
                ["Ambiguous Sync Jobs", data.ambiguousJobs, "Awaiting manual review"],
                ["Dead-Letter Sync Jobs", data.deadLetterJobs, "Exhausted retries"],
              ] as Array<[string, number, string]>).map((row) => {
                const metric = row[0]; const value = row[1]; const note = row[2];
                return (
                  <tr key={metric} className="hover:bg-[var(--color-muted)]/40">
                    <td className="px-4 py-2 text-[var(--color-foreground)]">{metric}</td>
                    <td className="px-4 py-2 tabular-nums">{value}</td>
                    <td className="px-4 py-2 text-xs text-[var(--color-muted-foreground)]">{note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function VendorDashboardPage() {
  return (
    <ToastProvider>
      <VendorDashboardInner />
    </ToastProvider>
  );
}
