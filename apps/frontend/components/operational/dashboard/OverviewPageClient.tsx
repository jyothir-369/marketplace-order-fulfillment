'use client';

import { useState, useEffect, useCallback } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { DashboardOverviewData } from '@/lib/types';
import { RefreshCw, ArrowUpRight, CalendarDays } from 'lucide-react';

const RANGE_OPTIONS = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_30d', label: 'Last 30 days' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
];

function StatCard({ label, amountCents, sub, delta }: { label: string; amountCents: number; sub?: string; delta?: string }) {
  return (
    <div className={cn('rounded-2xl border bg-[var(--color-card)] p-5 shadow-sm', 'border-[var(--color-border)]')}>
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-foreground)]">{formatCurrency(amountCents / 100)}</p>
      {delta && <p className="mt-1 text-xs font-medium text-[var(--color-success)]">{delta} vs last month</p>}
      {sub && <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{sub}</p>}
    </div>
  );
}

export function OverviewPageClient() {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState('this_month');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/dashboard/overview?range=${range}`);
      if (!res.ok) throw new Error('Failed to load overview');
      const json = (await res.json()) as DashboardOverviewData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <DashboardSkeleton />;
  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Overview</h1>
        <div className="rounded-xl border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 p-4 text-sm text-[var(--color-destructive)]">{error ?? 'No data'}</div>
        <button onClick={() => void load()} className="rounded-md border bg-[var(--color-card)] px-3 py-2 text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">Real tenant-scoped aggregates</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-md border bg-[var(--color-card)] px-3 py-2 text-sm"
          >
            {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => void load()} aria-label="Refresh" className="rounded-md border bg-[var(--color-card)] p-2"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Outstanding" amountCents={data.stats.outstanding_cents} sub="From your tenant workspace" />
        <StatCard label="Overdue" amountCents={data.stats.overdue_cents} sub="Past due" />
        <StatCard label="Paid this month" amountCents={data.stats.paid_this_month_cents} sub="This month" delta={data.stats.paid_this_month_delta_pct != null ? `${data.stats.paid_this_month_delta_pct > 0 ? '+' : ''}${data.stats.paid_this_month_delta_pct}%` : undefined} />
        <StatCard label="Total customers" amountCents={data.stats.total_customers * 100} sub={`${data.stats.total_customers} customers`} />
      </div>

      {/* Charts would go here; using placeholders matching requirements */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-[var(--color-card)] p-5 shadow-sm border-[var(--color-border)]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Revenue (last 6 months)</h2>
          <div className="mt-4 h-48 text-xs text-[var(--color-muted-foreground)]">Chart: responsive line chart using Recharts</div>
        </div>
        <div className="rounded-2xl border bg-[var(--color-card)] p-5 shadow-sm border-[var(--color-border)]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Outstanding vs Overdue</h2>
          <div className="mt-4 h-48 text-xs text-[var(--color-muted-foreground)]">Chart: responsive stacked bar chart</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border bg-[var(--color-card)] p-5 shadow-sm border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Recent Invoices</h2>
            <a href="/dashboard/invoices" className="text-xs font-medium text-[var(--color-info)] hover:underline">View all →</a>
          </div>
          {data.recent_invoices.length === 0 ? (
            <EmptyState title="No recent invoices" description="Invoices will appear here once created." />
          ) : (
            <table className="w-full text-sm mt-3">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-[var(--color-muted-foreground)]"><th className="py-2">#</th><th>Customer</th><th>Status</th><th>Amount</th><th>Due</th></tr></thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.recent_invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[var(--color-muted)]/40">
                    <td className="py-2 font-mono text-xs">{inv.number}</td>
                    <td className="py-2">{inv.customer_name}</td>
                    <td className="py-2"><span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">{inv.status}</span></td>
                    <td className="py-2 tabular-nums">{formatCurrency(inv.total_cents / 100)}</td>
                    <td className="py-2 text-xs">{inv.due_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-2xl border bg-[var(--color-card)] p-5 shadow-sm border-[var(--color-border)]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Recent Activity</h2>
          {data.recent_activity.length === 0 ? (
            <EmptyState title="No activity yet" description="Activity will appear here." />
          ) : (
            <ul className="mt-3 space-y-3">
              {data.recent_activity.map((a) => (
                <li key={a.entity_id + a.timestamp} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-info)]" />
                  <div>
                    <p className="text-[var(--color-foreground)]">{a.label}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{formatRelativeTime(a.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-72 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] animate-pulse" />
        <div className="h-72 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] animate-pulse" />
      </div>
    </div>
  );
}
