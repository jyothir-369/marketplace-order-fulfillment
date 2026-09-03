"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Package, Truck, XCircle } from "lucide-react";
import { getAdminDashboard, getAdminOrders } from "@/lib/api";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AdminDashboardDto, AdminOrderDto } from "@/lib/types";

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: React.ComponentType<Record<string, unknown>>; accent: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-text-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
        </div>
        <div className={["rounded-full p-2", accent].join(" ")}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

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
        getAdminOrders({ type: "stuck", limit: 20 }),
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
        <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (error || !dash) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-8 w-8 text-alert-error" />
        <p className="text-text-muted">{error ?? "Failed to load dashboard"}</p>
        <button onClick={() => void load()} className="rounded border border-border bg-surface-elevated px-4 py-2 text-sm hover:bg-surface-base">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Orders (24h)" value={dash.totalOrders} icon={Package} accent="bg-accent-primary/10 text-accent-primary" />
        <KpiCard label="Dead-Letter" value={dash.deadLetterJobs} icon={XCircle} accent="bg-alert-error/10 text-alert-error" />
        <KpiCard label="Ambiguous" value={dash.ambiguousJobs} icon={AlertTriangle} accent="bg-alert-warning/10 text-alert-warning" />
        <KpiCard label="Fulfilled" value={dash.fulfilledOrders} icon={CheckCircle} accent="bg-accent-success/10 text-accent-success" />
      </div>

      {/* Throughput panel */}
      <div className="rounded-lg border border-border bg-surface-elevated p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">Throughput</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div><p className="text-xs text-text-muted">Pending</p><p className="text-xl font-bold text-text-primary">{dash.pendingOrders}</p></div>
          <div><p className="text-xs text-text-muted">Fulfilled</p><p className="text-xl font-bold text-accent-success">{dash.fulfilledOrders}</p></div>
          <div><p className="text-xs text-text-muted">Cancelled</p><p className="text-xl font-bold text-alert-error">{dash.cancelledOrders}</p></div>
          <div><p className="text-xs text-text-muted">Revenue</p><p className="text-xl font-bold text-accent-primary">${dash.totalRevenue.toLocaleString()}</p></div>
        </div>
      </div>

      {/* Stuck orders */}
      <div className="rounded-lg border border-border bg-surface-elevated p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-alert-warning" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Orders Needing Attention ({stuck.length})
          </h2>
        </div>
        {stuck.length === 0 ? (
          <p className="text-sm text-text-muted">No stuck orders. System is healthy.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="pb-2">Order ID</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Stuck Reason</th>
                  <th className="pb-2">Line Items</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stuck.map(o => (
                  <tr key={o.orderId} className="hover:bg-surface-base">
                    <td className="py-2 font-mono text-xs">{o.orderId}</td>
                    <td className="py-2"><StatusBadge status={o.status} size="sm" /></td>
                    <td className="py-2 text-alert-warning">{o.stuckReason ?? "MANUAL_INTERVENTION_REQUIRED"}</td>
                    <td className="py-2">{o.lineItems.length}</td>
                    <td className="py-2 text-text-muted">{new Date(o.createdAt).toLocaleString()}</td>
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
  return (
    <ToastProvider>
      <AdminDashboardInner />
    </ToastProvider>
  );
}