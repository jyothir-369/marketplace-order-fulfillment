"use client";
import Link from "next/link";
import { Smartphone, ArrowUpRight } from "lucide-react";
export function MobilePromoInline() {
  return (
    <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-v2" aria-label="Mobile app promotion">
      <div className="flex items-center gap-2 mb-2"><Smartphone size={18} className="text-[var(--color-brass)]" aria-hidden /><h2 className="font-display text-base font-bold">Marketplace App</h2></div>
      <p className="text-xs text-[var(--color-warm-muted)] mb-2">Deep links for products, orders, vendors. Push notifications supported.</p>
      <div className="flex gap-3 text-xs text-[var(--color-ink-navy)]">
        <Link href="/products/1?deep=app" className="hover:underline">Product</Link>
        <Link href="/orders/123?deep=app" className="hover:underline">Order</Link>
        <Link href="/vendors/acme-b2b?deep=app" className="hover:underline">Vendor</Link>
      </div>
    </aside>
  );
}
