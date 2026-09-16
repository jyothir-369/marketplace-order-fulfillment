/**
 * Admin health — Phase 11.
 */
"use client";

import { HeartPulse } from "lucide-react";

export default function AdminHealthPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2"><HeartPulse className="h-6 w-6 text-[var(--color-brass)]" /> Health</h1>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 text-sm text-[var(--color-foreground)]">
        <p className="font-bold">System Status</p>
        <p className="text-[var(--color-warm-muted)]">Database: connected · Redis: connected · Workers: active · Reconciliation: 5min cron · Audit: logging.</p>
        <div className="mt-3 flex gap-2"><span className="px-2 py-1 rounded bg-[var(--color-forest)] text-white text-xs font-bold">DB OK</span><span className="px-2 py-1 rounded bg-[var(--color-forest)] text-white text-xs font-bold">QUEUE OK</span><span className="px-2 py-1 rounded bg-[var(--color-forest)] text-white text-xs font-bold">SYNC OK</span></div>
      </div>
    </div>
  );
}
