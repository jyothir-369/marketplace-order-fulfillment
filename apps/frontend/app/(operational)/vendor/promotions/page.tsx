/**
 * Vendor Promotions — Phase 10.
 */
"use client";

import { Megaphone } from "lucide-react";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function VendorPromotionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2"><Megaphone className="h-6 w-6 text-[var(--color-brass)]" /> Promotions</h1>
      <ComingSoon note="Promotion management (coupons, flash deals, discounts) is deferred — no backend CRUD exists yet." />
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 text-sm text-[var(--color-warm-muted)]">Manage discounts, flash deals, and coupon codes for your storefront. Full promotion CRUD (Phase 9 backend) to be wired here.</div>
    </div>
  );
}
