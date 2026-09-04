/**
 * app/(storefront)/vendors/[vendorId]/page.tsx — Vendor showcase (§3).
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      <Link
        href="/vendors"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to vendors
      </Link>

      <div className="mb-6 flex items-start gap-4">
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[var(--color-muted)] to-[var(--color-secondary)] text-[var(--color-primary)] shrink-0">
          <Store className="h-7 w-7" aria-hidden />
        </div>
        <div>
          {loading ? (
            <>
              <Skeleton height="1.5rem" width="14rem" />
              <Skeleton height="1rem" width="8rem" className="mt-1" />
            </>
          ) : vendor ? (
            <>
              <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
                {vendor.name}
              </h1>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
                {vendor.activeProductCount} active product{vendor.activeProductCount !== 1 ? "s" : ""}
                {vendor.activeProductCount !== vendor.productCount && (
                  <> &middot; {vendor.productCount} total</>
                )}
              </p>
            </>
          ) : hasLoaded ? (
            <>
              <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Vendor not found</h1>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
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
