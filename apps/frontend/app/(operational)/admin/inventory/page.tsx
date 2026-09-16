/**
 * Admin inventory — Phase 11.
 */
"use client";

import { Warehouse } from "lucide-react";

export default function AdminInventoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Warehouse className="h-6 w-6 text-[var(--color-brass)]" /> Inventory</h1>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 text-sm text-[var(--color-warm-muted)]">Inventory health table: stock levels, low-stock alerts, out-of-stock counts, and adjustment history. Uses existing `inventory` service and product repository aggregates.</div>
    </div>
  );
}
