/**
 * Related products — Phase 12 (recommendation rail).
 */
"use client";

import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { getCatalogPage, type Product } from "@/lib/api";

export function RelatedProducts({ productId, category }: { productId: string; category: string | null }) {
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => {
    if (!category) { getCatalogPage({ pageSize: 4 }).then((r) => setItems(r.items.filter((p) => p.id !== productId).slice(0, 4))); return; }
    getCatalogPage({ category, pageSize: 8 }).then((r) => setItems(r.items.filter((p) => p.id !== productId).slice(0, 4)));
  }, [productId, category]);
  return (
    <section aria-label="Related products" className="mt-12">
      <h2 className="font-display text-xl font-bold flex items-center gap-2 mb-4">Related <ArrowRight className="h-4 w-4 text-[var(--color-brass)]" /></h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((p) => (
          <a key={p.id} href={`/products/${p.id}`} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-v2 hover:shadow-v2-lg hover:-translate-y-0.5 transition">
            <div className="h-24 rounded-xl bg-[var(--color-cream)] mb-3 flex items-center justify-center text-2xl font-display font-bold text-[var(--color-ink-navy)]">{p.name.charAt(0)}</div>
            <h3 className="font-display text-sm font-bold truncate">{p.name}</h3>
            <p className="text-xs text-[var(--color-warm-muted)]">{p.vendorName} · ${p.price}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
