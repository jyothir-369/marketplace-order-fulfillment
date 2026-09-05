/**
 * app/(storefront)/products/page.tsx — Catalog page.
 *
 * V2 Premium treatment:
 *   - Editorial section eyebrow ("SHOP THE FULL CATALOG") in brass uppercase
 *   - Serif H1 "All products" (Playfair Display via font-display)
 *   - Inter meta line ("N products across M vendors")
 *   - Category pills: V2 style (navy active, ivory inactive, warm border)
 *   - Warm-toned search, vendor select, and max-price inputs
 *   - Warm ivory grid background, V2 shadows on header
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package } from "lucide-react";
import { getCatalog, type Product } from "@/lib/api";
import { useCartStore } from "@/context/CartStore";
import { CatalogGrid } from "@/components/storefront/CatalogGrid";
import { useToast, ToastProvider } from "@/components/ui/toast";
import { editorialEyebrows } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Stable category tab definitions.
export const CATEGORY_TABS = [
  { value: "",              label: "All" },
  { value: "Electronics",  label: "Electronics" },
  { value: "Apparel",      label: "Apparel" },
  { value: "Home & Living",label: "Home & Living" },
  { value: "Industrial",   label: "Industrial" },
] as const;

// ---------------------------------------------------------------------------
// Inner catalog (needs useToast)
// ---------------------------------------------------------------------------

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

  const handleSeed = async () => {
    try {
      const { seedCatalog } = await import("@/lib/api");
      const result = await seedCatalog();
      toast(
        `Seeded ${result.productsCreated} products (${result.vendorsCreated} vendors).`,
        "success"
      );
      void loadProducts();
    } catch {
      toast("Failed to seed catalog.", "error");
    }
  };

  // Client-side filter
  const filtered = products.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (vendor && p.vendorId !== vendor) return false;
    if (category && p.category !== category) return false;
    if (maxPrice !== undefined && p.price > maxPrice) return false;
    return true;
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
    <div className="max-w-7xl mx-auto px-6 py-10" id="catalog-panel">
      {/* Page header — V2 editorial */}
      <div className="mb-8">
        {/* Eyebrow */}
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)] mb-1">
          {editorialEyebrows.catalog}
        </p>
        {/* H1 */}
        <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)] mb-1">
          All products
        </h1>
        {/* Vendor count meta */}
        <p className="text-sm text-[var(--color-warm-muted)]">
          {filtered.length}&nbsp;
          {filtered.length === 1 ? "product" : "products"}
          {vendors.length > 0 && (
            <>
              &nbsp;across {vendors.length}&nbsp;
              {vendors.length === 1 ? "vendor" : "vendors"}
            </>
          )}
        </p>
      </div>

      {/* Seed button */}
      <button
        type="button"
        onClick={handleSeed}
        className={cn(
          "mb-6 inline-flex items-center gap-1.5",
          "px-3 py-1.5 rounded-full",
          "text-xs font-semibold",
          "border border-[var(--color-border)]",
          "bg-[var(--color-card)] text-[var(--color-warm-muted)]",
          "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
          "transition-colors"
        )}
      >
        <Package className="h-3.5 w-3.5" aria-hidden />
        Seed catalog
      </button>

      {/* Category tabs — V2 pill style */}
      <div
        className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-0.5"
        role="tablist"
        aria-label="Filter by category"
      >
        {CATEGORY_TABS.map((tab) => {
          const isActive = category === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="catalog-panel"
              onClick={() => updateFilter("category", tab.value)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium",
                "border transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-1",
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent"
                  : "bg-[var(--color-card)] text-[var(--color-warm-muted)] border-[var(--color-border)] hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search + vendor + maxPrice filters — V2 warm inputs */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <label htmlFor="search" className="sr-only">
            Search products
          </label>
          <input
            id="search"
            type="search"
            value={q}
            onChange={(e) => updateFilter("q", e.target.value)}
            placeholder="Search products..."
            className={cn(
              "w-full h-10 px-3 rounded-md border",
              "border-[var(--color-border)] bg-[var(--color-card)]",
              "text-sm text-[var(--color-foreground)]",
              "placeholder:text-[var(--color-warm-subtle)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            )}
          />
        </div>

        <select
          value={vendor}
          onChange={(e) => updateFilter("vendor", e.target.value)}
          className={cn(
            "h-10 px-3 rounded-md border",
            "border-[var(--color-border)] bg-[var(--color-card)]",
            "text-sm text-[var(--color-foreground)]",
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
            "h-10 w-32 px-3 rounded-md border",
            "border-[var(--color-border)] bg-[var(--color-card)]",
            "text-sm text-[var(--color-foreground)]",
            "placeholder:text-[var(--color-warm-subtle)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          )}
          aria-label="Maximum price"
        />

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className={cn(
              "h-10 px-4 rounded-md text-sm font-medium",
              "text-[var(--color-warm-muted)] underline underline-offset-2",
              "hover:text-[var(--color-foreground)] transition-colors"
            )}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className={cn(
            "mb-4 rounded-md border p-4 text-sm font-medium",
            "border-[var(--color-destructive)]",
            "bg-[var(--color-destructive)]/8",
            "text-[var(--color-destructive)]"
          )}
        >
          {error}
        </div>
      )}

      {/* Product grid */}
      <CatalogGrid
        products={filtered}
        loading={loading}
        quantities={quantities}
        onQuantityChange={setQty}
        onAdd={handleAdd}
        addedIds={addedIds}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrapper — provides ToastProvider context
// ---------------------------------------------------------------------------

export default function ProductsPage() {
  return (
    <ToastProvider>
      <ProductsPageInner />
    </ToastProvider>
  );
}