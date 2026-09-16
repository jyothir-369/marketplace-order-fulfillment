/**
 * Vendor Settings — Phase 10.
 */
"use client";

import { Settings } from "lucide-react";

export default function VendorSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2"><Settings className="h-6 w-6 text-[var(--color-brass)]" /> Settings</h1>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 space-y-4">
        <div><label className="text-xs font-bold text-[var(--color-warm-muted)]">Store Name</label><input defaultValue="Electronics World" className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm" /></div>
        <div><label className="text-xs font-bold text-[var(--color-warm-muted)]">Shipping Policy</label><input defaultValue="Ships in 48h. Free standard, $6.99 express." className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm" /></div>
        <button className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold">Save Settings</button>
      </div>
    </div>
  );
}
