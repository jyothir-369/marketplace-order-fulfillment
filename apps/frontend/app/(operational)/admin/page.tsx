/** Admin Dashboard — premium operational console redesign.
 * Preserves: /api/admin/dashboard, /api/admin/kpi, /api/admin/analytics,
 * AuthGuard + RolesGuard (ADMIN/OPERATIONS), real DB data.
 * Brand-neutral refined palette; accessible labels; skeletons + empty/error states.
 */
"use client";
import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp, Users, Clock, CheckCircle, AlertTriangle,
  RefreshCw, ArrowUpRight, DollarSign, Activity, BarChart3, ShieldCheck
} from "lucide-react";
import { getAdminDashboard, getAdminKPI, getAdminAnalytics } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type W = "7d" | "14d" | "30d";

export default function AdminDashboardPage() {
  const [days, setDays] = useState<W>("14d");
  const [dash, setDash] = useState<any>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const dashboard = await getAdminDashboard();
      setDash(dashboard);
      try { setKpi(await getAdminKPI()); } catch (kpiErr: any) {
        console.error("[Admin] KPI unavailable:", kpiErr);
        setKpi(null);
      }
    } catch (e: any) { setError(e?.message || "Dashboard unavailable"); }
    finally { setLoading(false); }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true); setAnalyticsError(null);
    try {
      const d = days === "7d" ? 7 : days === "30d" ? 30 : 14;
      setAnalytics(await getAdminAnalytics(d));
    } catch (e: any) { setAnalyticsError(e?.message || "Telemetry unavailable"); }
    finally { setAnalyticsLoading(false); }
  }, [days]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);

  const refreshAll = async () => { setRefreshing(true); await load(); await loadAnalytics(); setRefreshing(false); };

  if (loading) return (
    <div className="min-h-screen bg-[#f7f4ef] text-[#2b2b2b]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Skeleton className="h-9 w-72 mb-10 bg-[#ebe8df] rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-10">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-28 rounded-2xl bg-[#ebe8df]" />)}</div>
        <div className="grid gap-6 md:grid-cols-2 mb-10">{[0,1].map(i=><Skeleton key={i} className="h-72 rounded-2xl bg-[#ebe8df]" />)}</div>
        <Skeleton className="h-56 rounded-2xl bg-[#ebe8df] mb-6" />
        <Skeleton className="h-48 rounded-2xl bg-[#ebe8df]" />
      </div>
    </div>
  );

  if (error || !dash) return (
    <div className="min-h-screen bg-[#f7f4ef] flex items-center justify-center px-6">
      <div className="rounded-3xl border border-[#e6e2d6] bg-[#fffdf7] p-10 shadow-xl max-w-lg text-center">
        <div className="mx-auto mb-5 rounded-full bg-rose-50 p-4 w-16 h-16 flex items-center justify-center shadow-inner"><AlertTriangle className="h-8 w-8 text-rose-700" /></div>
        <h2 className="text-xl font-semibold text-[#3b2e22] mb-2">Dashboard unavailable</h2>
        <p className="text-sm text-[#6b5e4f] mb-6">{error ?? "Failed to load operational data."}</p>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl bg-[#2b2b2b] text-[#f7f4ef] px-5 py-2.5 text-sm font-medium hover:bg-[#3a3a3a] shadow-md transition"><RefreshCw className="h-4 w-4" /> Retry</button>
      </div>
    </div>
  );

  const cards = [
    { label: "Total Revenue", value: `R ${dash.totalRevenue ?? 0}`, sub: `${dash.totalOrders ?? 0} orders`, icon: DollarSign, accent: "bg-amber-700" },
    { label: "Total Orders", value: String(dash.totalOrders ?? 0), sub: kpi ? `AOV R ${kpi.aov ?? 0}` : "", icon: TrendingUp, accent: "bg-emerald-800" },
    { label: "Average Order Value", value: kpi ? `R ${kpi.aov ?? 0}` : "—", sub: "Fulfilled orders", icon: ArrowUpRight, accent: "bg-sky-800" },
    { label: "Active Vendors", value: kpi ? String(kpi.activeVendors ?? 0) : "—", sub: "Registered vendors", icon: Users, accent: "bg-violet-800" },
    { label: "Pending Applications", value: kpi ? String(kpi.pendingApplications ?? 0) : "—", sub: "Awaiting review", icon: Clock, accent: "bg-rose-800" },
    { label: "Fulfillment Rate", value: kpi ? `${kpi.fulfillmentRate ?? 0}%` : "—", sub: "Fulfilled / processed", icon: CheckCircle, accent: "bg-teal-800" },
  ];

  const segments = dash ? [
    { label: "Fulfilled", value: dash.fulfilledOrders || 0, color: "#1a4d2e" },
    { label: "Fulfilling", value: dash.fulfillingOrders || 0, color: "#c8963e" },
    { label: "Pending", value: dash.pendingOrders || 0, color: "#bfa678" },
    { label: "Cancelled", value: dash.cancelledOrders || 0, color: "#8b3a3a" },
  ].filter(s => s.value > 0) : [];
  const totalSeg = segments.reduce((s, x) => s + x.value, 0);

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-[#2b2b2b]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <main className="flex-1 min-w-0">
          <header className="flex items-end justify-between gap-4 flex-wrap mb-10">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#2b2b2b] leading-none">Admin Dashboard</h1>
              <p className="text-sm text-[#6b5e4f] mt-2">Real-time operational overview · ivory theme · ADMIN / OPERATIONS</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className={cn("flex rounded-xl border overflow-hidden shadow-sm bg-[#fffdf7] border-[#e6e2d6]")} aria-label="Analytics window">
                {(["7d","14d","30d"] as W[]).map(w => <button key={w} onClick={() => setDays(w)} aria-pressed={days===w} className={cn("px-3.5 py-2 text-xs font-semibold transition", days===w ? "bg-[#2b2b2b] text-[#f7f4ef]" : "text-[#5b5349] hover:bg-[#ebe8df]")}>{w}</button>)}
              </div>
              <button onClick={() => void refreshAll()} disabled={refreshing || analyticsLoading} aria-label="Refresh dashboard" className={cn("inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition bg-[#fffdf7] text-[#2b2b2b] hover:bg-[#ebe8df] border-[#e6e2d6]", (refreshing||analyticsLoading)&&"opacity-60 cursor-not-allowed")}>
                <RefreshCw className={cn("h-4 w-4", refreshing ? "animate-spin" : "")} /> Refresh
              </button>
            </div>
          </header>

          <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label="KPIs">
            {cards.map(c => (
              <article key={c.label} className="group relative rounded-3xl border p-6 shadow-sm hover:-translate-y-1 transition bg-[#fffdf7] border-[#e6e2d6]">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("rounded-xl p-2.5 shadow-inner", c.accent)} aria-hidden><c.icon className="h-5 w-5 text-white" /></div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-[#8b7665] font-extrabold">{c.label}</span>
                </div>
                <p className="text-3xl font-extrabold text-[#2b2b2b] tabular-nums tracking-tight leading-none">{c.value}</p>
                <p className="text-xs text-[#8b7665] mt-2 font-medium">{c.sub}</p>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition"><Activity className="h-4 w-4 text-[#ebe8df]" /></div>
              </article>
            ))}
          </section>

          <section className="mb-10 grid gap-6 md:grid-cols-2" aria-label="Charts">
            <article className="rounded-3xl border border-[#e6e2d6] bg-[#fffdf7] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5"><BarChart3 className="h-5 w-5 text-[#2b2b2b]" aria-hidden /><h2 className="text-base font-bold tracking-tight">Revenue & Orders Trend</h2></div>
              {analytics ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-2 h-48" aria-label="Revenue chart">
                    {(analytics.throughput || []).slice(-10).map((t: any, i: number) => (
                      <div key={i} className="flex-1 flex flex-col gap-1 items-center" aria-label={`Day ${i}`}>
                        <div className="w-full rounded-t-xl bg-[#2b2b2b]/90 shadow-inner" style={{ height: `${Math.min(100, (t.placed || 0) / 6 + 10)}%` }} />
                        <div className="w-full rounded-t-md bg-[#c8963e]/40" style={{ height: `${Math.min(80, (t.fulfilling || 0) / 6 + 5)}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#6b5e4f] font-medium"><span><span className="w-2.5 h-2.5 rounded-sm bg-[#2b2b2b]/90 inline-block mr-1.5" />Orders placed</span><span>Window: last {days}</span></div>
                </div>
              ) : analyticsLoading ? <Skeleton className="h-48 rounded-2xl bg-[#ebe8df]" /> : analyticsError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center"><p className="text-xs text-rose-800 font-medium">Telemetry unavailable</p><p className="text-[11px] text-rose-600 mt-1">{analyticsError}</p></div> : <div className="rounded-2xl border border-[#e6e2d6] bg-[#fffdf7]/60 p-8 text-center"><p className="text-sm text-[#5b5349] font-medium">Telemetry not loaded</p><p className="text-xs text-[#8b7665] mt-1">Select window and click Refresh.</p></div>}
            </article>

            <article className="rounded-3xl border border-[#e6e2d6] bg-[#fffdf7] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5"><ShieldCheck className="h-5 w-5 text-[#2b2b2b]" aria-hidden /><h2 className="text-base font-bold tracking-tight">Order Status Distribution</h2></div>
              {segments.length === 0 ? <div className="flex items-center justify-center h-48 text-sm text-[#8b7665] font-medium">No status data available.</div> : (
                <div className="flex items-center gap-6">
                  <div className="relative h-36 w-36 shrink-0" aria-label="Status donut chart">
                    <svg viewBox="0 0 36 36" className="rotate-[-90deg] h-full w-full"><g>{(() => { let offset = 0; return segments.map((seg: any, i: number) => { const pct = totalSeg ? seg.value / totalSeg : 0; const start = offset; offset += pct; const la = pct > 0.5 ? 1 : 0; const x1 = Math.cos(start * Math.PI * 2) * 16 + 18, y1 = Math.sin(start * Math.PI * 2) * 16 + 18, x2 = Math.cos(offset * Math.PI * 2) * 16 + 18, y2 = Math.sin(offset * Math.PI * 2) * 16 + 18; return <path key={i} d={`M 18 18 L ${x1} ${y1} A 16 16 0 ${la} 1 ${x2} ${y2} Z`} fill={seg.color} />; }); })()}</g></svg>
                    <div className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-[#f7f4ef] flex items-center justify-center shadow-inner"><span className="text-[10px] font-extrabold text-[#2b2b2b]">Orders</span></div>
                  </div>
                  <div className="flex-1 space-y-3">
                    {segments.map((seg: any) => <div key={seg.label} className="flex justify-between items-center text-sm"><span className="inline-flex items-center gap-3 text-[#3b2e22] font-medium"><span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: seg.color }} />{seg.label}</span><span className="text-xs font-extrabold tabular-nums text-[#5b5349]">{seg.value}</span></div>)}
                  </div>
                </div>
              )}
            </article>
          </section>

          <section className="mb-10 grid gap-6 md:grid-cols-3" aria-label="Trends">
            <article className="rounded-3xl border border-[#e6e2d6] bg-[#fffdf7] p-6 shadow-sm">
              <h2 className="text-base font-bold mb-4 tracking-tight">Vendor Growth</h2>
              {kpi && (kpi.vendorTrends || []).length > 0 ? <ul className="space-y-3">{kpi.vendorTrends.map((v: any) => <li key={v.vendorName} className="flex justify-between items-center text-sm"><span className="truncate max-w-[70%] text-[#3b2e22] font-medium">{v.vendorName}</span><span className="text-xs font-extrabold text-[#5b5349] tabular-nums">{v.productCount}</span></li>)}</ul> : <div className="rounded-xl border border-[#e6e2d6] bg-[#fffdf7]/60 p-6 text-center"><p className="text-xs text-[#8b7665] font-medium">No vendor trend data.</p></div>}
            </article>
            <article className="rounded-3xl border border-[#e6e2d6] bg-[#fffdf7] p-6 shadow-sm">
              <h2 className="text-base font-bold mb-4 tracking-tight">Category Performance</h2>
              {kpi && (kpi.categoryTrends || []).length > 0 ? <ul className="space-y-3">{kpi.categoryTrends.map((c: any) => <li key={c.category} className="flex justify-between items-center text-sm"><span className="truncate max-w-[70%] text-[#3b2e22] font-medium">{c.category}</span><span className="text-xs font-extrabold text-[#5b5349] tabular-nums">{c.count}</span></li>)}</ul> : <div className="rounded-xl border border-[#e6e2d6] bg-[#fffdf7]/60 p-6 text-center"><p className="text-xs text-[#8b7665] font-medium">No category data.</p></div>}
            </article>
            <article className="rounded-3xl border border-[#e6e2d6] bg-[#fffdf7] p-6 shadow-sm">
              <h2 className="text-base font-bold mb-4 tracking-tight">Fulfillment Trends</h2>
              {analytics ? <div className="text-sm text-[#3b2e22]"><p>Latency avg: <span className="font-extrabold">{analytics.latency ? ((analytics.latency.averageMs || 0) / 1000).toFixed(2) + " s" : "—"}</span></p><p className="text-xs text-[#8b7665] mt-1">Sample count: {analytics.latency?.count ?? 0}</p></div> : analyticsLoading ? <Skeleton className="h-24 bg-[#ebe8df] rounded-xl" /> : <div className="rounded-xl border border-[#e6e2d6] bg-[#fffdf7]/60 p-6 text-center"><p className="text-xs text-[#8b7665] font-medium">Load telemetry.</p></div>}
            </article>
          </section>

          <section className="mb-10 rounded-3xl border border-[#e6e2d6] bg-[#fffdf7] p-6 shadow-sm" aria-label="Alerts">
            <h2 className="text-base font-bold mb-4 tracking-tight">Operational Alerts</h2>
            {kpi && kpi.operationalAlerts && kpi.operationalAlerts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">{kpi.operationalAlerts.map((a: any) => (
                <div key={a.type + a.message} className={cn("rounded-2xl border px-5 py-4 shadow-sm transition", a.severity === "critical" ? "border-rose-300 bg-rose-50" : a.severity === "warning" ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50")}>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#2b2b2b]">{a.type}</p>
                  <p className="text-sm text-[#3b2e22] font-medium mt-1">{a.message}</p>
                </div>
              ))}</div>
            ) : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center"><CheckCircle className="h-6 w-6 text-emerald-700 mx-auto mb-2" /><p className="text-sm text-[#3b2e22] font-medium">No critical alerts. System healthy.</p></div>}
          </section>

          <section className="rounded-3xl border border-[#e6e2d6] bg-[#fffdf7] p-6 shadow-sm" aria-label="Activity">
            <h2 className="text-base font-bold mb-4 tracking-tight">Recent Activity</h2>
            {kpi && kpi.recentActivity && kpi.recentActivity.length > 0 ? (
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] uppercase tracking-[0.15em] text-[#8b7665] font-extrabold border-b border-[#e6e2d6]"><th className="text-left py-3 px-2">Timestamp</th><th className="text-left py-3 px-2">Actor</th><th className="text-left py-3 px-2">Action</th><th className="text-left py-3 px-2">Details</th></tr></thead>
              <tbody className="divide-y divide-[#ebe8df]">{kpi.recentActivity.map((row: any, i: number) => {
                const ts = row.timestamp ? new Date(row.timestamp).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "—";
                return <tr key={i} className="hover:bg-[#ebe8df]/40 transition"><td className="py-3 px-2 text-xs tabular-nums text-[#6b5e4f] font-medium">{ts}</td><td className="py-3 px-2 text-sm text-[#2b2b2b] font-medium">{row.actor || "System"}</td><td className="py-3 px-2 text-sm text-[#3b2e22] font-medium">{row.action || row.label || "—"}</td><td className="py-3 px-2 text-xs text-[#5b5349]">{row.details || row.label || "—"}</td></tr>;
              })}</tbody></table></div>
            ) : <div className="rounded-2xl border border-[#e6e2d6] bg-[#fffdf7]/60 p-6 text-center"><Clock className="h-6 w-6 text-[#bfa678] mx-auto mb-2" /><p className="text-sm text-[#5b5349] font-medium">No recent activity recorded.</p></div>}
          </section>
        </main>
      </div>
    </div>
  );
}
