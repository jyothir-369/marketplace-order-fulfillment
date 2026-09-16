/**
 * Vendor Analytics — Phase 10 (vendor portal depth).
 * Shows orders/revenue/sync health from existing backend endpoints.
 */
"use client";

import { BarChart, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { getVendorDashboard } from "@/lib/api";

export default function VendorAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVendorDashboard()
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-48 flex items-center justify-center text-sm text-[var(--color-warm-muted)]">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2"><BarChart className="h-6 w-6 text-[var(--color-brass)]" /> Analytics</h1>
      {data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active Products", value: data.activeProductCount ?? 0 },
            { label: "Total Stock", value: data.totalStock ?? 0 },
            { label: "Pending Sync", value: data.pendingSyncJobs ?? 0 },
            { label: "Open Orders", value: data.openOrders ?? 0 },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-v2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brass)]">{k.label}</p>
              <p className="font-display text-3xl font-bold text-[var(--color-foreground)] mt-1">{k.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 text-sm text-[var(--color-warm-muted)]">Analytics unavailable. Ensure vendor-scoped endpoints are wired.</div>
      )}
    </div>
  );
}
