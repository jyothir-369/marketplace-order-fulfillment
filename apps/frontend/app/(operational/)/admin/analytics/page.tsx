/**
 * Admin analytics — Phase 11 (real chart data stub).
 */
"use client";

import { TrendingUp } from "lucide-react";
import { getAdminDashboard } from "@/lib/api";
import { useEffect, useState } from "react";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { getAdminDashboard().then(setData).catch(() => setData(null)); }, []);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-[var(--color-brass)]" /> Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: data?.totalOrders ?? 0 },
          { label: "Total Revenue", value: data?.totalRevenue ? "$" + (data.totalRevenue / 100).toFixed(2) + "k" : "—" },
          { label: "Pending", value: data?.pendingOrders ?? 0 },
          { label: "Fulfilled", value: data?.fulfilledOrders ?? 0 },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-v2"><p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brass)]">{k.label}</p><p className="font-display text-2xl font-bold">{k.value}</p></div>
        ))}
      </div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 text-sm text-[var(--color-warm-muted)]">Real analytics aggregates from `/api/admin/dashboard` (existing stub enhanced with counts) + `/api/admin/orders` + inventory service. Full chart data endpoints to be backed by analytics aggregates.</div>
    </div>
  );
}
