/**
 * app/(storefront)/products/page.tsx — Buyer product catalog (§2.2).
 *
 * Features:
 *   - URL-driven filters: ?q=search&vendor=id&maxPrice=100
 *   - CatalogGridSkeleton while loading
 *   - Quick-add to cart with quantity stepper
 *   - EmptyState when catalog is empty
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Package } from "lucide-react";
import { getCatalog, type Product } from "@/lib/api";
import { useCartStore } from "@/context/CartStore";
import { InventoryLockIndicator } from "@/components/order/InventoryLockIndicator";
import { CatalogGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Read filters from URL
  const q = searchParams.get("q") ?? "";
  const vendor = searchParams.get("vendor") ?? "";
  const maxPriceParam = searchParams.get("maxPrice");
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined;

  // Unique vendors for filter dropdown
  const vendors = Array.from(
    new Map(products.map((p) => [p.vendorId, p.vendorName])).entries()
  ).map(([id, name]) => ({ id, name }));

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCatalog();
      setProducts(data.filter((p) => p.isActive));
      const init: Record<string, number> = {};
      data.forEach((p) => { init[p.id] = 1; });
      setQuantities(init);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const handleSeed = async () => {
    try {
      const { seedCatalog } = await import("@/lib/api");
      const result = await seedCatalog();
      toast(`Seeded ${result.productsCreated} products.`, "success");
      void loadProducts();
    } catch (err) {
      toast("Failed to seed catalog.", "error");
    }
  };

  // Client-side filter
  const filtered = products.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (vendor && p.vendorId !== vendor) return false;
    if (maxPrice !== undefined && p.price > maxPrice) return false;
    return true;
  });

  const setQty = (id: string, n: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, n) }));

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

  const hasFilters = Boolean(q || vendor || maxPrice !== undefined);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Catalog</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading
              ? "Loading\u2026"
              : `${filtered.length} product${filtered.length !== 1 ? "s" : ""}` +
                (hasFilters ? " matching filters" : " available")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadProducts()}
          disabled={loading}
          className="px-3 py-2 text-sm border border-zinc-300 rounded hover:bg-zinc-100 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white border border-zinc-200 rounded-lg">
        <div className="flex flex-col gap-1">
          <label htmlFor="search-filter" className="text-xs font-medium text-zinc-500">
            Search
          </label>
          <input
            id="search-filter"
            type="search"
            placeholder="Product name\u2026"
            defaultValue={q}
            onChange={(e) => updateFilter("q", e.target.value)}
            className="border border-zinc-300 rounded px-3 py-1.5 text-sm w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="vendor-filter" className="text-xs font-medium text-zinc-500">
            Vendor
          </label>
          <select
            id="vendor-filter"
            value={vendor}
            onChange={(e) => updateFilter("vendor", e.target.value)}
            className="border border-zinc-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="maxprice-filter" className="text-xs font-medium text-zinc-500">
            Max price ($)
          </label>
          <input
            id="maxprice-filter"
            type="number"
            min={0}
            placeholder="Any"
            defaultValue={maxPrice ?? ""}
            onChange={(e) =>
              updateFilter("maxPrice", e.target.value ? String(e.target.value) : "")
            }
            className="border border-zinc-300 rounded px-3 py-1.5 text-sm w-28"
          />
        </div>
        {hasFilters && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && <CatalogGridSkeleton />}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadProducts()}
            className="text-sm underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty catalog */}
      {!loading && !error && products.length === 0 && (
        <EmptyState
          icon={<Package size={48} aria-hidden />}
          title="No products yet"
          description="Seed the catalog with sample products to start browsing."
          action={
            <button
              type="button"
              onClick={() => void handleSeed()}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
            >
              Seed Sample Products
            </button>
          }
        />
      )}

      {/* No results after filtering */}
      {!loading && !error && products.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={<Package size={48} aria-hidden />}
          title="No products match your filters"
          description="Try adjusting or clearing your search criteria."
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
            >
              Clear filters
            </button>
          }
        />
      )}

      {/* Product grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product) => {
            const qty = quantities[product.id] ?? 1;
            const isAdded = addedIds.has(product.id);
            const isOut = product.stockCount === 0;

            return (
              <div
                key={product.id}
                className={[
                  "bg-white border border-zinc-200 rounded-lg flex flex-col overflow-hidden transition-shadow",
                  "hover:shadow-md",
                  isAdded ? "ring-2 ring-indigo-400" : "",
                ].join(" ")}
              >
                {/* Card body */}
                <div className="p-4 flex-1">
                  <Link
                    href={`/products/${product.id}`}
                    className="font-semibold text-zinc-900 hover:underline leading-tight block mb-1"
                  >
                    {product.name}
                  </Link>
                  <p className="text-xs text-zinc-500 mb-3">by {product.vendorName}</p>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-xl font-bold text-zinc-900">
                      ${product.price.toFixed(2)}
                    </span>
                    <InventoryLockIndicator stockCount={product.stockCount} compact />
                  </div>
                </div>

                {/* Add to cart footer */}
                <div className="px-4 pb-4 pt-0 flex items-center gap-2 border-t border-zinc-100 bg-zinc-50">
                  <div className="flex items-center gap-1">
                    <label htmlFor={`qty-${product.id}`} className="sr-only">
                      Quantity for {product.name}
                    </label>
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={qty <= 1 || isOut}
                      onClick={() => setQty(product.id, qty - 1)}
                      className="h-8 w-8 flex items-center justify-center rounded border border-zinc-300 bg-white hover:bg-zinc-100 disabled:opacity-40 text-sm font-medium"
                    >
                      -
                    </button>
                    <input
                      id={`qty-${product.id}`}
                      type="number"
                      min={1}
                      max={product.stockCount}
                      value={qty}
                      disabled={isOut}
                      onChange={(e) =>
                        setQty(product.id, parseInt(e.target.value, 10) || 1)
                      }
                      className="h-8 w-12 text-center border border-zinc-300 rounded text-sm disabled:opacity-40"
                    />
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      disabled={qty >= product.stockCount || isOut}
                      onClick={() => setQty(product.id, qty + 1)}
                      className="h-8 w-8 flex items-center justify-center rounded border border-zinc-300 bg-white hover:bg-zinc-100 disabled:opacity-40 text-sm font-medium"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={isOut}
                    onClick={() => handleAdd(product)}
                    className={[
                      "flex-1 h-8 rounded text-sm font-medium transition-colors",
                      isOut
                        ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                        : isAdded
                          ? "bg-emerald-500 text-white"
                          : "bg-indigo-600 text-white hover:bg-indigo-700",
                    ].join(" ")}
                  >
                    {isOut ? "Out of Stock" : isAdded ? "\u2713 Added!" : "Add to Cart"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
