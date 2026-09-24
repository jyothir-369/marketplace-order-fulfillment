/**
 * app/(storefront)/for-you/page.tsx — Phase 3: For You entry point.
 *
 * Uses real catalog/vendor/recently-viewed/wishlist data when available.
 * Graceful empty states when history is missing.
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, Clock, Heart, ArrowRight, RefreshCcw } from "lucide-react";
import { getCatalog, getCategories } from "@/lib/api";
import { useRecentlyViewed } from "@/lib/hooks/use-recently-viewed";
import { CatalogGridSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/api";
import type { CategorySummaryDto } from "@/lib/types";

function getId(item: { productId?: string; id?: string }) {
  return item.productId ?? item.id ?? "";
}
function getName(item: { name?: string }) { return item.name ?? ""; }
function getPrice(item: { price?: number }) { return item.price ?? 0; }
function getVendor(item: { vendorName?: string }) { return item.vendorName ?? "Marketplace"; }

export default function ForYouPage() {
  const recently = useRecentlyViewed();
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCatalog(), getCategories()])
      .then(([c, cats]) => {
        if (!cancelled) {
          setCatalog(c.filter((p) => p.isActive));
          setCategories(cats);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Recommendations: recently viewed first, then a diverse sample from catalog
  const recs = recently.items.length > 0
    ? recently.items.slice(0, 4)
    : catalog.slice(0, 4);

  // Deals: use deal category / first 4 active products as proxy
  const deals = catalog.slice(0, 4);

  // Wishlist items — no backend wishlist store yet; show empty-state with recovery
  const wishlistEmpty = true; // placeholder until wishlist backend exists

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-14">
      <section aria-label="For You">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-[var(--color-brass)]" aria-hidden />
            For You
          </h1>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-brass)] hover:underline"
          >
            Full catalog <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-sm text-[var(--color-warm-muted)] max-w-xl">
          Personalized picks based on your recently viewed products, catalog activity, and saved wishlist.
        </p>
      </section>

      {/* Recently viewed / recommendations */}
      <section aria-label="Recommended for you">
        <div className="flex items-center justify-between mb-5 gap-4">
          <h2 className="font-display text-2xl font-bold">Recommended for you</h2>
          <span className="text-xs text-[var(--color-warm-subtle)]">Based on your activity</span>
        </div>
        {loading ? (
          <CatalogGridSkeleton count={4} />
        ) : recs.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center shadow-v2">
            <Clock className="h-8 w-8 text-[var(--color-warm-subtle)] mx-auto mb-3" aria-hidden />
            <p className="font-display text-lg font-semibold text-[var(--color-foreground)]">No recommendations yet</p>
            <p className="text-sm text-[var(--color-warm-muted)] mt-1">Browse products to build your personalized feed.</p>
            <Link href="/products" className="inline-block mt-3 px-4 py-2 rounded-md text-sm font-semibold bg-[var(--color-primary)] text-white hover:opacity-90">
              Browse catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recs.map((item) => (
              <Link
                key={getId(item)}
                href={`/products/${getId(item)}`}
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-v2 hover:shadow-v2-lg transition"
              >
                <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-muted)] mb-3" aria-hidden />
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-brass)] transition-colors truncate">{getName(item)}</h3>
                <p className="text-xs text-[var(--color-warm-muted)]">{getVendor(item)}</p>
                <p className="text-sm font-display font-bold mt-1">${getPrice(item)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Deals */}
      <section aria-label="Deals">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="font-display text-2xl font-bold">Deals</h2>
          <Link href="/deals" className="text-xs font-medium text-[var(--color-brass)] hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {deals.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`} className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-v2 hover:shadow-v2-lg transition">
              <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-muted)] mb-3" aria-hidden />
              <h3 className="text-sm font-semibold truncate">{p.name}</h3>
              <p className="text-xs text-[var(--color-warm-muted)]">{p.vendorName}</p>
              <p className="font-display font-bold mt-1">${p.price}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Wishlist — empty-state with recovery */}
      <section aria-label="Your wishlist">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Heart className="h-6 w-6 text-[var(--color-brass)]" aria-hidden />
            Wishlist
          </h2>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-v2 text-center">
          <Heart className="h-10 w-10 text-[var(--color-warm-subtle)] mx-auto mb-3" aria-hidden />
          <p className="font-display text-lg font-semibold text-[var(--color-foreground)]">Wishlist is empty</p>
          <p className="text-sm text-[var(--color-warm-muted)] mt-1">Save items from product pages to see them here.</p>
          <Link href="/products" className="inline-block mt-3 px-4 py-2 rounded-md text-sm font-semibold bg-[var(--color-ink-navy)] text-[var(--color-brass)] hover:opacity-90">Browse products</Link>
        </div>
      </section>

      {/* Saved searches placeholder */}
      <section aria-label="Saved searches">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold">Saved searches</h2>
          <button
            type="button"
            onClick={() => alert("Save search feature activates when search state is persisted.")}
            className="text-xs font-medium text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)] underline underline-offset-2"
          >
            Save current search
          </button>
        </div>
        <div className="rounded-2xl border border-dashed border-[var(--color-warm-border)] bg-[var(--color-cream)]/30 p-6 text-center">
          <RefreshCcw className="h-6 w-6 text-[var(--color-warm-subtle)] mx-auto mb-2" aria-hidden />
          <p className="text-sm text-[var(--color-warm-muted)]">Saved searches will appear here when you save a search query.</p>
        </div>
      </section>
    </div>
  );
}
