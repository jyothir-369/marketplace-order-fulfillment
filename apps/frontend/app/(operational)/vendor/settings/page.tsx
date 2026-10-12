/**
 * Vendor Settings — Phase 10. Deferred (no persist layer yet).
 * Consistent with Promotions — marked Coming Soon until vendor profile columns added.
 */
"use client";

import { Settings } from "lucide-react";

export default function VendorSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2"><Settings className="h-6 w-6 text-[var(--color-brass)]" /> Settings</h1>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2">
        <p className="text-sm text-[var(--color-warm-muted)]">Vendor profile settings are coming soon. Contact support to update store details.</p>
      </div>
    </div>
  );
}
