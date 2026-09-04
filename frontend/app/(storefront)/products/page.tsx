/**
 * app/(storefront)/products/page.tsx â€”
 *
 * Features:
 *   - URL-driven filters: ?q=search&vendor=id&maxPrice=100
 *   - CatalogGrid (glassmorphic ProductCards) while loading â†’ CatalogGridSkeleton
 *   - Explicit error banner when fetch fails
 *   - "0 products found" only shown after a *successful* empty-API response
 *   - Quick-add to cart with quantity stepper
 *   - Category filter via dropdown (populated from seed data)
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package } from "lucide-react";
import { getCatalog, type Product } from "@/lib/api";
import { useCartStore } from "@/context/CartStore";
import { CatalogGrid } from "@/components/storefront/CatalogGrid";
import { useToast, ToastProvider } from "@/components/ui/toast";

const BUYER_ID = "00000000-0000-0000-0000-000000000001";

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
  /** True once the first fetch has completed successfully.
   *  Only when hasLoaded is true do we know the empty state is real. */
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Read filters from URL
  const q = searchParams.get("q") ?? "";
  const vendor = searchParams.get("vendor") ?? "";
  const category = searchParams.get("category") ?? "";
  const maxPriceParam = searchParams.get("maxPrice");
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined;

  // Client-side category list from loaded products (deduplicated).
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c)))
  ).sort();

  // Unique vendors for filter dropdown
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
      // hasLoaded stays false so empty state is never shown on error.
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const handleSeed = async () => {
    try {
      const { seedCatalog } = await import("@/lib/api");
      const result = await seedCatalog();
      toast(`Seeded ${result.productsCreated} products (${result.vendorsCreated} vendors).`, "success");
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

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/products?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => router.push("/products", { scroll: false });

  const hasFilters = Boolean(q || vendor || category || maxPrice !== undefined);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Catalog
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            {loading
              ? "Loading\u2026"
              : hasLoaded && filtered.length === 0
                ? "No products found"
                : `${filtered.length} product${filtered.length !== 1 ? "s" : ""}` +
                  (hasFilters ? " matching filters" : " available")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSeed}
          className="px-3 py-1.5 text-sm rounded border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-accent)] text-[var(--color-foreground)]"
        >
          <Package className="inline h-4 w-4 mr-1 -mt-0.5" aria-hidden />
          Seed catalog
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <label htmlFor="search" className="sr-only">
            Search products
          </label>
          <input
            id="search"
            type="search"
            value={q}
            onChange={(e) => updateFilter("q", e.target.value)}
            placeholder="Search products\u2026"
            className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          />
        </div>

        <select
          value={category}
          onChange={(e) => updateFilter("category", e.target.value)}
          className="h-10 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={vendor}
          onChange={(e) => updateFilter("vendor", e.target.value)}
          className="h-10 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
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
          className="h-10 w-32 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          aria-label="Maximum price"
        />

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-10 px-4 rounded-md text-sm font-medium text-[var(--color-foreground)] underline underline-offset-2 hover:opacity-80"
          >
            Clear filters
          </button>
        )}
      </div>

      {/*
        GAP (Phase 1): Explicit error banner.
        Rendered AFTER filters so it is visually prominent.
        Only shown when hasLoaded is false AND an error is present —
        this guarantees "0 products found" is never shown on a failed fetch.
      */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] p-4 text-sm font-medium"
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
// Wrapper â€”, provides ToastProvider context
// ---------------------------------------------------------------------------

export default function ProductsPage() {
  return (
    <ToastProvider>
      <ProductsPageInner />
    </ToastProvider>
  );
}
