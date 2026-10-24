/**
 * Admin analytics — Phase 12 (KPI + charts + alerts + activity, real data
 * from /api/admin/dashboard + /api/admin/kpi). Contract: totalRevenue decimal
 * (not cents); AOV = AVG totalAmount of fulfilled orders only.
 */
"use client";

import { TrendingUp, RefreshCw, AlertCircle } from "lucide-react";
import { getAdminDashboard, getAdminKPI } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import type { AdminDashboardDto } from "@/lib/types";

type Kpi = {
  aov: number;
  activeVendors: number;
  pendingApplications: number;
  fulfillmentRate: number;
  categoryTrends: { category: string; count: number }[];
  vendorTrends: { vendorName: string; productCount: number }[];
  operationalAlerts: { type: string; message: string; severity: string }[];
  recentActivity: { label: string; timestamp: string }[];
};

export default function AdminAnalyticsPage() {
  const [dateFilter, setDateFilter] = useState("all");
  const [data, setData] = useState<AdminDashboardDto | null>(null);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, k] = await Promise.all([getAdminDashboard(), getAdminKPI()]);
      setData(d);
      setKpi(k);
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics");
      setData(null);
      setKpi(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

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
          disabled={loading || !!error}
          aria-label="Refresh analytics"
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-cream)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-[var(--color-warn)]" role="alert">{error}</p>}

      {/* 6 KPI cards */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2" aria-label="KPIs">
        <h2 className="text-sm font-semibold mb-3">KPIs</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CardBox label="AOV" value={loading ? "—" : (kpi?.aov == null ? "—" : formatCurrency(kpi.aov))} />
          <CardBox label="Active Vendors" value={loading ? "—" : kpi?.activeVendors ?? 0} />
          <CardBox label="Pending Apps" value={loading ? "—" : kpi?.pendingApplications ?? 0} />
          <CardBox label="Fulfillment Rate" value={loading ? "—" : `${kpi?.fulfillmentRate ?? 0}%`} />
          <CardBox label="Category Trends" value={loading ? "—" : (kpi?.categoryTrends?.length ?? 0)} sub={"categories"} />
          <CardBox label="Vendor Trends" value={loading ? "—" : (kpi?.vendorTrends?.length ?? 0)} sub={"vendors"} />
        </div>
      </section>

      {/* Charts */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2" aria-label="Trends">
        <h2 className="text-sm font-semibold mb-3">Category & Vendor Trends</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Chart title="Top Categories">
            {((kpi?.categoryTrends ?? []) as {category:string;count:number}[]).length ? ((kpi?.categoryTrends ?? []) as {category:string;count:number}[]).map((t) => (
              <TrendRow key={t.category} name={t.category} count={t.count} />
            )) : <Empty />}
          </Chart>
          <Chart title="Top Vendors">
            {((kpi?.vendorTrends ?? []) as {vendorName:string;productCount:number}[]).length ? ((kpi?.vendorTrends ?? []) as {vendorName:string;productCount:number}[]).map((t) => (
              <TrendRow key={t.vendorName} name={t.vendorName} count={t.productCount} />
            )) : <Empty />}
          </Chart>
        </div>
      </section>

      {/* Operational alerts */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2" aria-label="Alerts">
        <h2 className="text-sm font-semibold mb-3">Operational Alerts</h2>
        {!kpi?.operationalAlerts?.length ? <Empty /> : (
          <ul className="space-y-2">
            {kpi.operationalAlerts.map((a) => (
              <li key={a.type + a.message} className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warn)]" aria-hidden />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brass)]">{a.severity}</p>
                  <p className="text-sm">{a.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Activity table */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2" aria-label="Recent activity">
        <h2 className="text-sm font-semibold mb-3">Recent Activity</h2>
          {kpi && <TableActivity kpi={kpi} />}
          {!kpi && loading && <Empty />}
          {!kpi && !loading && <Empty />}
      </section>

      {/* Data contract */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2" aria-label="Metric notes">
        <h2 className="text-sm font-semibold mb-2">Data contract</h2>
        <ul className="text-sm text-[var(--color-warm-muted)] space-y-1 list-disc list-inside">
          <li>AOV computed from <code>orders</code> (fulfilled only) via AVG(totalAmount).</li>
          <li>Fulfillment rate computed from <code>orders.status</code> aggregates.</li>
          <li>Pending applications = <code>vendor_applications.status = pending</code>.</li>
          <li>Category/vendor trends = top-5 aggregates; no customer identifiers selected.</li>
          <li>Requires ADMIN or OPERATIONS role.</li>
        </ul>
      </section>
    </div>
  );
}

function CardBox({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-v2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brass)]">{label}</p>
      <p className="font-display text-2xl font-bold tabular-nums mt-1">{value}</p>
      {sub && <p className="text-xs text-[var(--color-warm-muted)] mt-1">{sub}</p>}
    </div>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-v2" aria-label={title}>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function TrendRow({ name, count }: { name: string; count: number }) {
  const widthPct = Math.min(100, Math.max(20, (count / Math.max(1, count + 20)) * 80 + 20));
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="w-28 truncate text-[var(--color-warm-muted)]">{name}</span>
      <span className="h-2.5 grow rounded-full bg-[var(--color-brand-accent)]" style={{ minWidth: `${widthPct}%` }} aria-hidden />
      <span className="w-6 text-right font-mono text-[var(--color-warm-muted)]">{count}</span>
    </li>
  );
}

function TableActivity({ kpi }: { kpi: Kpi }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brass)]"><tr><th className="text-left">Event</th><th className="text-left">Time (UTC)</th></tr></thead>
      <tbody>
        {(kpi.recentActivity ?? []).map((a, i) => (
          <tr key={i} className="border-t border-[var(--color-border)]"><td className="py-2">{a.label}</td><td className="py-2 text-[var(--color-warm-muted)]">{new Date(a.timestamp).toLocaleString()}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty() {
  return <p className="text-xs text-[var(--color-warm-muted)]">No data available.</p>;
}

