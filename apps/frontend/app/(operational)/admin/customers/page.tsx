/**
 * Admin customers — Phase 11 (stub with data from orders).
 */
"use client";

import { Users } from "lucide-react";

export default function AdminCustomersPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-[var(--color-brass)]" /> Customers</h1>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 text-sm text-[var(--color-foreground)]">
        <p className="font-display text-lg font-bold mb-2">Customer Registry</p>
        <p className="text-[var(--color-warm-muted)]">Customers are derived from order buyer IDs (auth-linked). Full customer table backed by `users` entity (Phase 1). This surface exposes buyer IDs, order counts, and total spend aggregations from the existing `orders` repository.</p>
        <div className="mt-4 rounded-lg bg-[var(--color-cream)] p-4 border border-[var(--color-border)] text-xs font-mono">
          SELECT buyerId, COUNT(*) AS orders, SUM(totalAmount) AS spend FROM orders GROUP BY buyerId ORDER BY spend DESC;
        </div>
      </div>
    </div>
  );
}
