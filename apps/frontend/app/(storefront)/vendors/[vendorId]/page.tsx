/**
 * app/(storefront)/vendors/[vendorId]/page.tsx � Vendor showcase (�3).
 *
 * V2 Premium treatment:
 *   - Warm gradient vendor hero card with serif title
 *   - Brass eyebrow label
 *   - Storefront catalog grid (Phase 3 ProductCard already V2-skinned)
 *   - Back link in editorial style
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";
import { getCatalog, getVendors } from "@/lib/api";
import type { ProductDto, VendorResponseDto } from "@/lib/types";
import { useCartStore } from "@/context/CartStore";
import { CatalogGrid } from "@/components/storefront/CatalogGrid";
import { useToast, ToastProvider } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

function VendorStorefrontInner() {
  const params = useParams();
  const vendorId = String(params.vendorId ?? "");
  const { push: toast } = useToast();
  const addToCart = useCartStore((s) => s.addToCart);

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [vendor, setVendor] = useState<VendorResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vendors, all] = await Promise.all([getVendors(), getCatalog()]);
      const foundVendor = vendors.find((v) => v.id === vendorId);
      setVendor(foundVendor ?? null);
      const vendorProducts = all.filter((p) => p.vendorId === vendorId && p.isActive);
      setProducts(vendorProducts);
      const init: Record<string, number> = {};
      vendorProducts.forEach((p) => { init[p.id] = 1; });
      setQuantities(init);
      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendor storefront");
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => { void load(); }, [load]);

  const setQty = (productId: string, n: number) =>
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(1, n) }));

  const handleAdd = (product: ProductDto) => {
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
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Back link */}
      <Link
        href="/vendors"
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium",
          "text-[var(--color-warm-muted)] hover:text-[var(--color-accent)]",
          "transition-colors mb-6 group"
        )}
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
        Back to vendors
      </Link>

      {/* Vendor profile hero */}
      <div className="mb-8 flex items-start gap-5">
        {/* Gradient icon block */}
        <div className={cn(
          "h-16 w-16 rounded-2xl shrink-0 flex items-center justify-center",
          "bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-ivory-muted)]",
          "text-[var(--color-accent)] shadow-v2"
        )}
          aria-hidden
        >
          <Store className="h-8 w-8" />
        </div>
        <div>
          {loading ? (
            <>
              <Skeleton height="2rem" width="14rem" />
              <Skeleton height="1rem" width="8rem" className="mt-2" />
            </>
          ) : vendor ? (
            <>
              <p
                aria-hidden
                className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)] mb-0.5"
              >
                Vendor storefront
              </p>
              <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)]">
                {vendor.name}
              </h1>
              <p className="text-sm text-[var(--color-warm-muted)] mt-1">
                {vendor.activeProductCount} active product{vendor.activeProductCount !== 1 ? "s" : ""}
                {vendor.activeProductCount !== vendor.productCount && (
                  <> &middot; {vendor.productCount} total</>
                )}
              </p>
            </>
          ) : hasLoaded ? (
            <>
              <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)]">Vendor not found</h1>
              <p className="text-sm text-[var(--color-warm-muted)] mt-1">
                This vendor may have been removed or has no active products.
              </p>
            </>
          ) : null}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] p-4 text-sm font-medium"
        >
          {error}
        </div>
      )}

      {loading ? (
        <CatalogGrid
          products={[]}
          loading={true}
          quantities={{}}
          onQuantityChange={() => undefined}
          onAdd={() => undefined}
          addedIds={new Set()}
        />
      ) : hasLoaded && products.length === 0 ? (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          }
          title="No products from this vendor yet"
          description="Check back later or browse other vendors."
        />
      ) : (
        <CatalogGrid
          products={products}
          loading={false}
          quantities={quantities}
          onQuantityChange={setQty}
          onAdd={handleAdd}
          addedIds={addedIds}
        />
      )}
    </div>
  );
}

export default function VendorStorefrontPage() {
  return (
    <ToastProvider>
      <VendorStorefrontInner />
    </ToastProvider>
  );
}
