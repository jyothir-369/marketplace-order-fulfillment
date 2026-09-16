/**
 * app/(storefront)/page.tsx — Brand cover rendered at `/`.
 *
 * V2 Premium cover, intentionally aligned with the catalog:
 *   - Lives INSIDE the (storefront) route group, so it inherits the sticky
 *     header, cart drawer and footer — one continuous site, not a standalone
 *     page bolted on in front.
 *   - Modern brass-editorial theme (CSS vars), matching the /products hero.
 *   - All merchandising is LIVE: category rail driven by getCategories(),
 *     product rail by getCatalog() through the same <CatalogGrid> the
 *     catalog page uses. No hardcoded "featured item" placeholders.
 *   - Covers lead the visitor into shopping via two clear CTAs:
 *     Browse Shop → /products, See Deals → /deals.
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgePercent,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Truck,
} from "lucide-react";
import { getCatalog, getCategories, type Product } from "@/lib/api";
import type { CategorySummaryDto } from "@/lib/types";
import { useCartStore } from "@/context/CartStore";
import { CatalogGrid } from "@/components/storefront/CatalogGrid";
import { CatalogGridSkeleton } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { editorialEyebrows } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Verified sellers" },
  { icon: Truck, label: "Tracked shipping" },
  { icon: Star, label: "Real reviews" },
  { icon: ShoppingBag, label: "Live inventory" },
];

// Honest cover merchandising: without a sales-history field on the DTO we
// feature a live slice of the active catalog (same contract as /products).
const FEATURED_LIMIT = 8;

function CoverInner() {
  const { push: toast } = useToast();
  const addToCart = useCartStore((s) => s.addToCart);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategorySummaryDto[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCatalog(), getCategories()])
      .then(([catalog, cats]) => {
        if (cancelled) return;
        const active = catalog.filter((p) => p.isActive);
        setProducts(active.slice(0, FEATURED_LIMIT));
        setCategories(cats);
        const init: Record<string, number> = {};
        active
          .slice(0, FEATURED_LIMIT)
          .forEach((p) => {
            init[p.id] = 1;
          });
        setQuantities(init);
      })
      .catch(() => {
        if (!cancelled) toast("Couldn’t load the featured feed.", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const featured = useMemo(
    () => products.slice(0, Math.max(4, Math.min(FEATURED_LIMIT, products.length))),
    [products]
  );

  const setQty = (productId: string, n: number) =>
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(1, n) }));

  const handleAdd = (product: Product) => {
    const qty = quantities[product.id] ?? 1;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      maxStock: product.stockCount,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
    });
    setAddedIds((prev) => new Set([...prev, product.id]));
    toast(`Added ${product.name} to cart.`, "success");
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-14">
      {/* ---- Cover hero ---- */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl",
          "bg-gradient-to-br from-[#0e1830] via-[#16233f] to-[#1d2d4f]",
          "border border-[var(--color-brass)]/35 text-white shadow-v2-lg",
          "p-8 sm:p-12"
        )}
      >
        <div className="absolute -right-10 -bottom-14 select-none opacity-10 text-[var(--color-brass)] pointer-events-none">
          <Sparkles className="h-48 w-48" strokeWidth={0.8} />
        </div>
        <div className="max-w-2xl space-y-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brass)]">
            {editorialEyebrows.catalog}
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-bold leading-[1.08]">
            Curated marketplace
            <span className="block text-[var(--color-brass)]">
              for makers and buyers.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-md">
            Independent vendors, verified inventory, and tracked fulfillment —
            every card below is a real, in-stock product from the live catalog.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-6 py-3 text-sm font-semibold text-[var(--color-ink-navy)] hover:opacity-90 transition"
            >
              Browse Shop <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/deals"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold hover:bg-white/5 transition"
            >
              See Deals <Tag className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Trust bar ---- */}
      <section aria-label="Why shop here">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TRUST_ITEMS.map((t) => (
            <div
              key={t.label}
              className="rounded-2xl border border-[var(--color-warm-border)] bg-[var(--color-card)] p-6 shadow-sm flex items-center gap-3"
            >
              <t.icon className="h-5 w-5 text-[var(--color-brass)] shrink-0" />
              <span className="text-sm font-medium text-[var(--color-foreground)]">
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Category rail (live) ---- */}
      <section aria-label="Shop by category">
        <div className="flex items-end justify-between mb-5 gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brass)]">
              {editorialEyebrows.catalog}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">
              Shop by category
            </h2>
          </div>
          <Link
            href="/products"
            className="text-sm font-medium text-[var(--color-brass)] hover:underline whitespace-nowrap"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-[var(--color-card)] border border-[var(--color-warm-border)] animate-pulse"
              />
            ))
          ) : categories.length === 0 ? (
            // No categories seeded yet — show a single useful entry point
            // instead of ghost skeletons that pulse forever.
            <Link
              href="/products"
              className="col-span-full md:col-span-4 group relative overflow-hidden rounded-2xl bg-[var(--color-ink-navy)] p-6 text-white hover:-translate-y-1 transition shadow-lg"
            >
              <h3 className="font-display text-base font-bold">All products</h3>
              <span className="mt-1 inline-block text-xs text-white/60 tracking-wide">
                Browse the full catalog →
              </span>
            </Link>
          ) : (
            categories.slice(0, 8).map((c) => (
              <Link
                key={c.name}
                href={`/products?category=${encodeURIComponent(c.name)}`}
                className="group relative overflow-hidden rounded-2xl bg-[var(--color-ink-navy)] p-6 text-white hover:-translate-y-1 transition shadow-lg"
              >
                <h3 className="font-display text-base font-bold">{c.name}</h3>
                <span className="mt-1 inline-block text-xs text-white/60 tracking-wide">
                  {c.activeProductCount} listed
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* ---- Featured rail (live catalog) ---- */}
      <section aria-label="Featured products">
        <div className="flex items-end justify-between mb-5 gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brass)]">
              {editorialEyebrows.product}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">
              Featured picks
            </h2>
            <p className="text-sm text-[var(--color-warm-muted)] mt-1 max-w-md">
              Sourced live from the catalog — verified sellers, real stock.
            </p>
          </div>
          <Link
            href="/deals"
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium",
              "text-[var(--color-brass)] hover:underline whitespace-nowrap"
            )}
          >
            <BadgePercent className="h-4 w-4" /> See deals
          </Link>
        </div>
        {loading ? (
          <CatalogGridSkeleton count={4} />
        ) : (
          <CatalogGrid
            products={featured}
            loading={false}
            quantities={quantities}
            onQuantityChange={setQty}
            onAdd={handleAdd}
            addedIds={addedIds}
          />
        )}
      </section>
    </div>
  );
}

export default function CoverPage() {
  return (
    <ToastProvider>
      <CoverInner />
    </ToastProvider>
  );
}