"use client";
/**
 * components/storefront/MobilePromo.tsx — Phase 5 mobile app promotion + deep links.
 */
import Link from "next/link";
import { Smartphone, ArrowUpRight } from "lucide-react";

export function MobilePromo() {
  return (
    <section aria-label="Mobile app" className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 mb-8">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--color-ink-navy)] text-[var(--color-brass)] flex items-center justify-center shrink-0"><Smartphone size={20} aria-hidden /></div>
        <div>
          <h2 className="font-display text-lg font-bold">Marketplace App</h2>
          <p className="text-xs text-[var(--color-warm-muted)] mb-3">Faster orders, push updates, deep links for products/orders/vendors.</p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/products/1?deep=app" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-ink-navy)] hover:underline"><ArrowUpRight size={12} aria-hidden /> Product link</Link>
            <Link href="/orders/123?deep=app" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-ink-navy)] hover:underline"><ArrowUpRight size={12} aria-hidden /> Order link</Link>
            <Link href="/vendors/acme-b2b?deep=app" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-ink-navy)] hover:underline"><ArrowUpRight size={12} aria-hidden /> Vendor link</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
