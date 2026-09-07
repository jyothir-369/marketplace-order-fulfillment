/**
 * app/(storefront)/vendors/[vendorId]/page.tsx — Luxury Vendor Showcase (§3).
 *
 * Upgraded from a plain gray box to a signature editorial brand showcase:
 *   - Rich signature category gradient hero banner
 *   - Elevated brand monogram emblem with brass rim
 *   - Trust & verification badges (Rating, Dispatch speed, Authenticity)
 *   - Clean back navigation & editorial breadcrumbs
 *   - CatalogGrid with Phase 3 luxury ProductCards
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Store,
  ShieldCheck,
  Star,
  Truck,
  Package,
  CheckCircle2,
  Wrench,
  Cpu,
  Shirt,
  Utensils,
  Activity,
} from "lucide-react";
import { getCatalog, getVendors } from "@/lib/api";
import type { ProductDto, VendorResponseDto } from "@/lib/types";
import { useCartStore } from "@/context/CartStore";
import { CatalogGrid } from "@/components/storefront/CatalogGrid";
import { useToast, ToastProvider } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getVendorMeta, type VendorMeta } from "@/lib/vendor-meta";
import { cn } from "@/lib/utils";

function CategoryIcon({ type, className }: { type: VendorMeta["iconType"]; className?: string }) {
  switch (type) {
    case "tools":
      return <Wrench className={className} />;
    case "electronics":
      return <Cpu className={className} />;
    case "fashion":
      return <Shirt className={className} />;
    case "home":
      return <Utensils className={className} />;
    case "sports":
      return <Activity className={className} />;
    default:
      return <Store className={className} />;
  }
}

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
      vendorProducts.forEach((p) => {
        init[p.id] = 1;
      });
      setQuantities(init);
      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendor storefront");
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const meta = getVendorMeta(vendor?.name);
  const initial = (vendor?.name ?? "M").charAt(0).toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Back link */}
      <Link
        href="/vendors"
        className={cn(
          "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider",
          "text-[var(--color-warm-muted)] hover:text-[var(--color-brass)]",
          "transition-colors group"
        )}
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
        <span>Back to All Vendors</span>
      </Link>

      {/* Signature Brand Showcase Hero Banner */}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl",
          "bg-[var(--color-card)] border border-[var(--color-warm-border)]",
          "shadow-v2-lg"
        )}
      >
        {/* Upper Signature Gradient Canvas */}
        <div
          className={cn(
            "relative h-40 sm:h-52 w-full overflow-hidden bg-gradient-to-r",
            meta.gradient
          )}
        >
          <div className="absolute inset-0 bg-black/20 mix-blend-multiply" />
          <div className="absolute -right-8 -bottom-8 opacity-20 text-white pointer-events-none">
            <CategoryIcon type={meta.iconType} className="h-48 w-48 transform -rotate-12" />
          </div>

          {/* Top banner badges */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/50 text-white backdrop-blur-md border border-white/20 shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
              Verified Marketplace Partner
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-black/60 text-amber-300 backdrop-blur-md border border-amber-400/30 shadow-xs">
              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              {meta.rating.toFixed(1)} Rating
            </span>
          </div>
        </div>

        {/* Lower Content & Brand Details */}
        <div className="px-6 sm:px-10 pb-8 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 mb-6">
            {/* Brand Monogram Avatar */}
            <div
              className={cn(
                "h-24 w-24 sm:h-28 sm:w-28 rounded-3xl flex items-center justify-center shrink-0",
                "bg-gradient-to-br shadow-xl ring-4 ring-[var(--color-card)]",
                meta.emblemGradient
              )}
            >
              <span className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">
                {initial}
              </span>
            </div>

            {/* Live Stats Pills */}
            <div className="flex flex-wrap items-center gap-2 sm:self-end">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-cream)] text-[var(--color-ink-navy)] border border-[var(--color-warm-border)] shadow-xs">
                <Package className="h-4 w-4 text-[var(--color-brass)]" />
                {products.length} Active Products
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-cream)] text-[var(--color-ink-navy)] border border-[var(--color-warm-border)] shadow-xs">
                <Truck className="h-4 w-4 text-[var(--color-forest)]" />
                Direct Dispatch
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-cream)] text-[var(--color-ink-navy)] border border-[var(--color-warm-border)] shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-sky-600" />
                Guaranteed Fulfillment
              </span>
            </div>
          </div>

          {/* Titles & Editorial Description */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton height="2.5rem" width="18rem" />
              <Skeleton height="1.25rem" width="30rem" />
            </div>
          ) : vendor ? (
            <div className="space-y-3 max-w-3xl">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brass)]">
                  {meta.category} &middot; {meta.established}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--color-foreground)] mt-1">
                  {vendor.name}
                </h1>
              </div>

              <p className="text-sm sm:text-base text-[var(--color-warm-muted)] leading-relaxed">
                {meta.tagline}
              </p>

              {/* Badges row */}
              <div className="pt-2 flex flex-wrap gap-2">
                {meta.highlights.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[var(--color-cream)]/70 text-[var(--color-warm-muted)] border border-[var(--color-warm-border)]"
                  >
                    ✦ {h}
                  </span>
                ))}
              </div>
            </div>
          ) : hasLoaded ? (
            <div>
              <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)]">Vendor not found</h1>
              <p className="text-sm text-[var(--color-warm-muted)] mt-1">
                This vendor may have been removed or has no active products.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] p-5 text-sm font-medium"
        >
          {error}
        </div>
      )}

      {/* Catalog Grid Section */}
      <section className="space-y-6 pt-2">
        <div className="flex items-center justify-between border-b border-[var(--color-warm-border)] pb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[var(--color-foreground)]">
              Storefront Collection
            </h2>
            <p className="text-xs text-[var(--color-warm-muted)] mt-0.5">
              Browse all authentic items fulfilled directly by {vendor?.name ?? "this vendor"}
            </p>
          </div>
          <span className="text-xs font-semibold text-[var(--color-warm-muted)]">
            {products.length} {products.length === 1 ? "Item" : "Items"}
          </span>
        </div>

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
            icon={<Store className="h-10 w-10 text-[var(--color-brass)]" />}
            title="No products from this vendor yet"
            description="Check back later or browse our other verified merchants."
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
      </section>
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
