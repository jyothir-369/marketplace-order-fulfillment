/**
 * app/(storefront)/products/page.tsx â€” Luxury Catalog Page (V2 Premium).
 *
 * Upgraded from a plain header to a full luxury editorial hero:
 *   - Midnight navy & brass editorial hero banner with trust badges
 *   - Marketplace performance metrics ribbon
 *   - Live search & category filter chips
 *   - Balanced 3-column responsive showcase grid
 */

"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  ShieldCheck,
  Truck,
  Star,
  Search,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { getCatalog, type Product } from "@/lib/api";
import { useCartStore } from "@/context/CartStore";
import { CatalogGrid } from "@/components/storefront/CatalogGrid";
import { CatalogGridSkeleton } from "@/components/ui/skeleton";
import { useToast, ToastProvider } from "@/components/ui/toast";
import { editorialEyebrows } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Stable category tab definitions.
const CATEGORY_TABS = [
  { value: "",              label: "All" },
  { value: "Electronics",  label: "Electronics" },
  { value: "Apparel",      label: "Apparel" },
  { value: "Home & Living",label: "Home & Living" },
  { value: "Industrial",   label: "Industrial" },
] as const;

/** Client-side sort options. Value maps to URL ?sort= param. */
const SORT_OPTIONS = [
  { value: "",            label: "Featured"          },
  { value: "price-asc",   label: "Price: Low → High" },
  { value: "price-desc",  label: "Price: High → Low" },
  { value: "newest",      label: "Newest"             },
] as const;

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push: toast } = useToast();
  const addToCart = useCartStore((s) => s.addToCart);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  /** True once the first fetch has completed successfully. */
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // URL-driven filters
  const q = searchParams.get("q") ?? "";
  const vendor = searchParams.get("vendor") ?? "";
  const category = searchParams.get("category") ?? "";
  const maxPriceParam = searchParams.get("maxPrice");
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined;
  const sort = searchParams.get("sort") ?? "";

  const vendors = Array.from(
    new Map(products.map((p) => [p.vendorId, p.vendorName])).entries()
  ).map(([id, name]) => ({ id, name }));

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCatalog({ category: category || undefined });
      setProducts(data.filter((p) => p.isActive));
      const init: Record<string, number> = {};
      data.forEach((p) => { init[p.id] = 1; });
      setQuantities(init);
      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  // Client-side filter
  const filtered = products.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (vendor && p.vendorId !== vendor) return false;
    if (category && p.category !== category) return false;
    if (maxPrice !== undefined && p.price > maxPrice) return false;
    return true;
  });

  // Client-side sort — applied after filtering so sort state is preserved
  // across filter changes without a server round-trip.
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price-asc")  return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    // "Featured" (default) and "newest" both retain catalog insertion order.
    return 0;
  });

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

  // URL filter helpers
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/products?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => router.push("/products", { scroll: false });
  const hasFilters = Boolean(q || vendor || maxPrice !== undefined);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8" id="catalog-panel">

      {/* 1. Midnight Navy & Brass Editorial Hero Banner */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl",
          "bg-gradient-to-br from-[#0e1830] via-[#16233f] to-[#1d2d4f]",
          "border border-[var(--color-brass)]/35 text-white shadow-v2-lg",
          "p-8 sm:p-12"
        )}
      >
        {/* Decorative glow & brand monogram watermark */}
        <div className="absolute -right-12 -bottom-16 select-none opacity-10 text-[var(--color-brass)] pointer-events-none">
          <ShoppingBag className="h-56 w-56" strokeWidth={0.8} />
        </div>
        {/* Subtle radial glow behind content */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(169,128,63,0.12),transparent_60%)]" />

        <div className="relative z-10 max-w-2xl space-y-5">
          {/* Eyebrow */}
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brass)]">
            {editorialEyebrows.catalog}
          </p>

          {/* Serif headline */}
          <h1 className="font-display text-4xl sm:text-5xl font-bold leading-[1.1] text-white">
            Discover curated goods from verified sellers
          </h1>

          {/* Tagline */}
          <p className="text-sm text-white/60 leading-relaxed max-w-md">
            Browse thousands of products across our curated merchant network â€” all backed by
            automated multi-carrier fulfillment and buyer protection.
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-brass)]" />
              Verified Sellers
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
              <Truck className="h-3.5 w-3.5 text-[var(--color-brass)]" />
              Fast Dispatch
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
              <Star className="h-3.5 w-3.5 text-[var(--color-brass)]" />
              Buyer Protected
            </span>
          </div>

          {/* Inline live search */}
          <div className="relative max-w-md pt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => updateFilter("q", e.target.value)}
              placeholder="Search the full catalog..."
              className={cn(
                "w-full h-11 pl-10 pr-4 rounded-xl",
                "bg-white/10 text-white placeholder:text-white/40",
                "border border-white/15 backdrop-blur-md",
                "text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]",
                "focus:border-[var(--color-brass)]/50",
                "transition-colors"
              )}
              aria-label="Search products"
            />
          </div>
        </div>
      </section>

      {/* 2. Marketplace Performance Metrics Ribbon */}
      {hasLoaded && (
        <section
          className={cn(
            "grid grid-cols-2 sm:grid-cols-4 gap-3",
            "bg-[var(--color-card)] border border-[var(--color-warm-border)]",
            "rounded-2xl p-4 shadow-v2"
          )}
        >
          {[
            { label: "Products", value: products.length, icon: <Package className="h-4 w-4" /> },
            { label: "Verified Sellers", value: vendors.length, icon: <ShieldCheck className="h-4 w-4" /> },
            { label: "Showing", value: sorted.length, icon: <Sparkles className="h-4 w-4" /> },
            { label: "Categories", value: CATEGORY_TABS.length - 1, icon: <ShoppingBag className="h-4 w-4" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="flex items-center gap-2.5 px-3 py-2">
              <span className="text-[var(--color-brass)]">{icon}</span>
              <div>
                <span className="block font-display text-lg font-bold text-[var(--color-foreground)] leading-none tabular-nums">
                  {value}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-warm-muted)]">
                  {label}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 3. Category Pills & Vendor + Price Filters */}
      <section className="space-y-4">
        {/* Category pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const isActive = category === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => updateFilter("category", tab.value)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-2",
                  isActive
                    ? "bg-[var(--color-ink-navy)] text-white shadow-xs ring-2 ring-[var(--color-brass)]/70"
                    : "bg-[var(--color-cream)]/70 text-[var(--color-warm-muted)] border border-[var(--color-warm-border)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-cream)]"
                )}
              >
                {tab.label}
              </button>
            );
          })}

          </div>

        {/* Vendor + Sort + Max price + clear */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-warm-muted)]">
            <span>Sort by</span>
            <select
              value={sort}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className={cn(
                "h-9 px-3 rounded-lg border text-xs font-medium",
                "border-[var(--color-warm-border)] bg-[var(--color-card)]",
                "text-[var(--color-foreground)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              )}
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <select
            value={vendor}
            onChange={(e) => updateFilter("vendor", e.target.value)}
            className={cn(
              "h-9 px-3 rounded-lg border text-xs font-medium",
              "border-[var(--color-warm-border)] bg-[var(--color-card)]",
              "text-[var(--color-foreground)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            )}
            aria-label="Filter by vendor"
          >
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          <input
            type="number"
            min={0}
            value={maxPrice ?? ""}
            onChange={(e) => updateFilter("maxPrice", e.target.value)}
            placeholder="Max price"
            className={cn(
              "h-9 w-32 px-3 rounded-lg border text-xs font-medium",
              "border-[var(--color-warm-border)] bg-[var(--color-card)]",
              "text-[var(--color-foreground)] placeholder:text-[var(--color-warm-subtle)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            )}
            aria-label="Maximum price"
          />

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className={cn(
                "h-9 px-4 rounded-lg text-xs font-semibold underline underline-offset-2",
                "text-[var(--color-warm-muted)]",
                "hover:text-[var(--color-foreground)] transition-colors"
              )}
            >
              Clear filters
            </button>
          )}

          {/* Live count */}
          <span className="ml-auto text-xs text-[var(--color-warm-muted)] tabular-nums">
            Showing <strong className="text-[var(--color-foreground)]">{sorted.length}</strong>
            {hasFilters && " of "}{hasFilters && products.length} products
          </span>
        </div>
      </section>

      {/* 4. Error state */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] p-5 text-sm font-medium"
        >
          {error}
        </div>
      )}

      {/* 5. Product Catalog Grid */}
      <section aria-label="Product catalog">
        <CatalogGrid
          products={sorted}
          loading={loading}
          quantities={quantities}
          onQuantityChange={setQty}
          onAdd={handleAdd}
          addedIds={addedIds}
        />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrapper â€” provides ToastProvider context
// ---------------------------------------------------------------------------

export default function ProductsPage() {
  return (
    <ToastProvider>
      <Suspense fallback={<CatalogGridSkeleton count={6} />}>
        <ProductsPageInner />
      </Suspense>
    </ToastProvider>
  );
}
