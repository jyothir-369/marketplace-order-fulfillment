/**
 * Admin reconciliation — Phase 11.
 */
"use client";

import { RefreshCw } from "lucide-react";

export default function AdminReconciliationPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2"><RefreshCw className="h-6 w-6 text-[var(--color-brass)]" /> Reconciliation</h1>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 text-sm text-[var(--color-warm-muted)]">Reconciliation run log: sync-state vs DB-state comparison, ambiguous-state resolution, dead-letter retry results. Endpoint: POST /api/fulfillment/reconcile (existing).</div>
    </div>
  );
}
