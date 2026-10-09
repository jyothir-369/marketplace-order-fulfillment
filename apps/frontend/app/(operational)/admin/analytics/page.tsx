/**
 * Admin analytics — Phase 11 (real data from /api/admin/dashboard).
 * Contract verified: totalRevenue is decimal currency (not cents); no /100, no +k.
 */
"use client";

import { TrendingUp, RefreshCw } from "lucide-react";
import { getAdminDashboard } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import type { AdminDashboardDto } from "@/lib/types";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getAdminDashboard();
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[var(--color-brass)]" aria-hidden />
          Analytics
        </h1>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh analytics"
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-cream)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="list" aria-label="Analytics summary">
        {[
          { label: "Total Orders", value: data?.totalOrders ?? 0, fmt: (v: number) => String(v) },
          { label: "Total Revenue", value: data?.totalRevenue ?? 0, fmt: (v: number) => formatCurrency(v) },
          { label: "Pending", value: data?.pendingOrders ?? 0, fmt: (v: number) => String(v) },
          { label: "Fulfilled", value: data?.fulfilledOrders ?? 0, fmt: (v: number) => String(v) },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-v2"
            role="listitem"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brass)]">{k.label}</p>
            <p className="font-display text-2xl font-bold tabular-nums">{loading ? "—" : k.fmt(k.value as number)}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2" aria-label="Metric notes">
        <h2 className="text-sm font-semibold mb-2">Data contract</h2>
        <ul className="text-sm text-[var(--color-warm-muted)] space-y-1 list-disc list-inside">
          <li>Total Revenue is returned from <code>/api/admin/dashboard</code> as decimal currency (not cents). It is formatted directly with <code>formatCurrency()</code>; no division by 100 and no <code>+k</code> suffix is applied.</li>
          <li>Pending / Fulfilled counts reflect <code>PLACED</code> and <code>FULFILLED</code> status aggregates from the backend.</li>
          <li>Dashboard endpoint requires ADMIN or OPERATIONS role (protected server-side).</li>
        </ul>
      </section>
    </div>
  );
}
