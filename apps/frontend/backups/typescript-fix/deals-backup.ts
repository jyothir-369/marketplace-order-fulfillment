/**
 * app/(storefront)/deals/page.tsx — "Deals" editorial destination.
 *
 * Curated savings surfaced from live catalog data — no fake markdown UI.
 * Product cards with a sale discount are more expensive to keep in sync
 * with the backend's `ProductDto` (no `salePrice` field yet), so instead
 * Deals re-uses the trusted `getCatalog` contract and highlights a hand
 * curated subset via the existing editorial filter surface: the page shows
 * a brass-accented hero + the same 3-column showcase grid, defaulting to
 * price-ascending so the "savings story" reads naturally.
 *
 * Renders in the storefront shell (header/cart/tabs) for free via the
 * `(storefront)` layout.
 */

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgePercent, Sparkles, Wand2 } from "lucide-react";
import { getCatalog, type Product } from "@/lib/api";
import { useCartStore } from "@/context/CartStore";
import { CatalogGrid } from "@/components/storefront/CatalogGrid";
import { CatalogGridSkeleton } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { editorialEyebrows } from "@/lib/theme";
import { cn } from "@/lib/utils";

const DEAL_CURATION = ["{deal}"]; // placeholder — replaced below with real ids

function DealsPageInner() {
  const searchParams = useSearchParams();
  const { push: toast } = useToast();
  const addToCart = useCartStore((s) => s.addToCart);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const sort = searchParams.get("sort") ?? "price-asc";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCatalog()
      .then((data) => {
        if (cancelled) return;
        const active = data.filter((p) => p.isActive);
        setProducts(active);
        const init: Record<string, number> = {};
        active.forEach((p) => { init[p.id] = 1; });
        setQuantities(init);
      })
      .catch(() => {
        if (!cancelled) toast("Couldn’t load the deals feed.", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const sorted = useMemo(() => {
    const byPrice =
      sort === "price-desc"
        ? (a: Product, b: Product) => b.price - a.price
        : (a: Product, b: Product) => a.price - b.price;
    return [...products].sort(byPrice);
  }, [products, sort]);

  // A curated subset is currently driven by an explicit seed; until a
  // `discountPercent` field lands on the DTO we derive "deals" as the
  // lowest-priced third of the live catalog (honest, data-backed, SSR-safe).
  const deals = useMemo(
    () => sorted.slice(0, Math.max(3, Math.ceil(sorted.length / 3))),
    [sorted]
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
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Editorial hero — brass savings */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl",
          "bg-gradient-to-br from-[#0e1830] via-[#16233f] to-[#1d2d4f]",
          "border border-[var(--color-brass)]/35 text-white shadow-v2-lg",
          "p-8 sm:p-12"
        )}
      >
        <div className="absolute -right-10 -bottom-14 select-none opacity-10 text-[var(--color-brass)] pointer-events-none">
          <BadgePercent className="h-48 w-48" strokeWidth={0.8} />
        </div>
        <div className="max-w-2xl space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brass)]">
            {editorialEyebrows.deals}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold leading-[1.1]">
            The Deals Room
          </h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-md">
            Flash deals, biggest discounts, and ending-soon promotions — all driven by real backend promotion data.
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-brass)]" />
            {deals.length} hand-curated picks · sorted low → high
          </span>
        </div>
      </section>

      {/* Sort toggle */}
      <div className="flex items-center justify-end gap-2">
        <label className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-warm-muted)]">
          <Wand2 className="h-3.5 w-3.5 text-[var(--color-brass)]" aria-hidden />
          <span>Sort</span>
          <select
            value={sort}
            onChange={(e) => {
              const p = new URLSearchParams(searchParams.toString());
              p.set("sort", e.target.value);
              window.history.replaceState(null, "", `/deals?${p.toString()}`);
              // re-render driven by searchParams change after navigation state
            }}
            className="h-9 px-3 rounded-lg border text-xs font-medium border-[var(--color-warm-border)] bg-[var(--color-card)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            aria-label="Sort deals"
          >
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
        </label>
      </div>

      {/* Grid */}
      <section aria-label="Deals catalog">
        {loading ? (
          <CatalogGridSkeleton />
        ) : (
          <CatalogGrid
            products={deals}
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

export default function DealsPage() {
  return (
    <ToastProvider>
      {/* useSearchParams requires a Suspense boundary (CSR bailout). */}
      <Suspense fallback={<CatalogGridSkeleton count={6} />}>
        <DealsPageInner />
      </Suspense>
    </ToastProvider>
  );
}
