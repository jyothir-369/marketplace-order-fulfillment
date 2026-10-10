/**
 * app/(storefront)/vendors/[vendorId]/page.tsx — Luxury Vendor Detail Page (V2 Premium).
 *
 * Full editorial brand experience upgraded from a basic card hero to:
 *   - Midnight navy + brass editorial hero (mirrors /products hero pattern)
 *   - "Our Story" editorial block with Playfair serif typography
 *   - 4-item stats grid (Active Catalog, Dispatch, Founded, Rating)
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
  ArrowRight,

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
import { editorialEyebrows } from "@/lib/theme";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const meta = getVendorMeta(vendor?.name);
  const initial = (vendor?.name ?? "M").charAt(0).toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">

      {/* Back link */}
      <Link
        href="/vendors"
        className={cn(
          "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider",
          "text-white/60 hover:text-[var(--color-brass)]",
          "transition-colors group"
        )}
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
        <span>Back to All Vendors</span>
      </Link>

      {/* ================================================================
          1. Editorial Hero — Midnight Navy + Brass
          ================================================================ */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl",
          "bg-gradient-to-br from-[#0e1830] via-[#16233f] to-[#1d2d4f]",
          "border border-[var(--color-brass)]/35 text-white shadow-v2-lg",
          "p-8 sm:p-12"
        )}
      >
        {/* Decorative monogram watermark */}
        <div
          aria-hidden
          className="absolute -right-8 -bottom-10 select-none pointer-events-none opacity-[0.07]"
        >
          <CategoryIcon type={meta.iconType} className="h-56 w-56" />
        </div>
        {/* Radial brass glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(169,128,63,0.12),transparent_60%)]" />

        <div className="relative z-10 max-w-2xl space-y-6">
          {/* Eyebrow */}
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brass)]">
            {editorialEyebrows.vendors}
          </p>

          {/* Vendor monogram emblem */}
          <div
            className={cn(
              "h-16 w-16 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br shadow-lg ring-4 ring-white/20"
            )}
            style={{ background: `linear-gradient(135deg, hsl(220 33% 22%), hsl(220 45% 8%))` }}
            aria-hidden
          >
            <span className="font-display text-3xl font-bold text-white/90 leading-none">
              {initial}
            </span>
          </div>

          {/* Vendor name + category */}
          {loading ? (
            <div className="space-y-2">
              <Skeleton height="3rem" width="18rem" className="rounded-xl" />
              <Skeleton height="1rem" width="12rem" className="rounded" />
            </div>
          ) : vendor ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                {meta.category} &middot; {meta.established}
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold leading-[1.1] text-white">
                {vendor.name}
              </h1>
              <p className="text-sm text-white/60 leading-relaxed max-w-md">
                {meta.tagline}
              </p>
            </>
          ) : null}

          {/* Trust badges */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-brass)]" />
              Verified Seller
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
              <Truck className="h-3.5 w-3.5 text-[var(--color-brass)]" />
              Fast Dispatch
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
              <Star className="h-3.5 w-3.5 text-[var(--color-brass)]" />
              {meta.rating.toFixed(1)} ({meta.reviewsCount} reviews)
            </span>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] p-5 text-sm font-medium"
        >
          {error}
        </div>
      )}

      {/* ================================================================
          2. "Our Story" Editorial Block
          ================================================================ */}
      {!loading && vendor && (
        <section className="space-y-6">
          {/* Section header */}
          <div className="flex items-center gap-4">
            <span className="h-px flex-1 bg-[var(--color-warm-border)]" />
            <h2 className="font-display text-xl font-bold text-[var(--color-foreground)] shrink-0">
              Our Story
            </h2>
            <span className="h-px flex-1 bg-[var(--color-warm-border)]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Paragraph 1 */}
            <div className="space-y-3">
              <p className="font-display text-lg font-bold text-[var(--color-foreground)] leading-snug">
                Founded on craft &amp; precision
              </p>
              <p className="text-sm text-[var(--color-warm-muted)] leading-relaxed">
                {vendor.name} has been a trusted name in the {meta.category.toLowerCase()} space since {meta.established.toLowerCase()}. Every item in the storefront reflects a commitment to quality that can not be rushed — from material selection to final inspection.
              </p>
            </div>

            {/* Paragraph 2 */}
            <div className="space-y-3">
              <p className="font-display text-lg font-bold text-[var(--color-foreground)] leading-snug">
                Sourced with intention
              </p>
              <p className="text-sm text-[var(--color-warm-muted)] leading-relaxed">
                {meta.tagline} The team behind {vendor.name} personally tests and curates every product to ensure it meets the standard their community of buyers has come to expect. Authenticity is never compromised.
              </p>
            </div>

            {/* Paragraph 3 */}
            <div className="space-y-3">
              <p className="font-display text-lg font-bold text-[var(--color-foreground)] leading-snug">
                Delivered with care
              </p>
              <p className="text-sm text-[var(--color-warm-muted)] leading-relaxed">
                Every order is handled directly through our automated multi-carrier fulfillment network — meaning faster dispatch, real-time tracking, and buyer protection built in. Questions? Our merchant team is one message away.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================
          3. Stats Grid — 4 key metrics
          ================================================================ */}
      {!loading && vendor && (
        <section
          className={cn(
            "grid grid-cols-2 sm:grid-cols-4 gap-3",
            "bg-[var(--color-card)] border border-[var(--color-warm-border)]",
            "rounded-2xl p-5 shadow-v2"
          )}
        >
          {/* Active Catalog */}
          <div className="flex items-start gap-3 px-3 py-2">
            <div className="mt-0.5 rounded-lg bg-[var(--color-brass)]/15 p-2 text-[var(--color-brass)]">
              <Package className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-[var(--color-foreground)] tabular-nums leading-none">
                {vendor.activeProductCount}
              </p>
              <p className="text-[10px] text-[var(--color-warm-muted)] mt-0.5 leading-tight">
                Active<br />Catalog
              </p>
            </div>
          </div>

          {/* Ships in Window */}
          <div className="flex items-start gap-3 px-3 py-2">
            <div className="mt-0.5 rounded-lg bg-[var(--color-forest)]/15 p-2 text-[var(--color-forest)]">
              <Truck className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-[var(--color-foreground)] tabular-nums leading-none">
                &lt;48h
              </p>
              <p className="text-[10px] text-[var(--color-warm-muted)] mt-0.5 leading-tight">
                Dispatch<br />Window
              </p>
            </div>
          </div>

          {/* Founding Year */}
          <div className="flex items-start gap-3 px-3 py-2">
            <div className="mt-0.5 rounded-lg bg-[var(--color-ink-navy)]/10 p-2 text-[var(--color-ink-navy)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </div>
            <div>
              <p className="font-display text-xl font-bold text-[var(--color-foreground)] tabular-nums leading-none">
                {meta.established.replace("Est. ", "")}
              </p>
              <p className="text-[10px] text-[var(--color-warm-muted)] mt-0.5 leading-tight">
                Founded<br />Year
              </p>
            </div>
          </div>

          {/* Fulfillment Rating */}
          <div className="flex items-start gap-3 px-3 py-2">
            <div className="mt-0.5 rounded-lg bg-[var(--color-accent)]/15 p-2 text-[var(--color-accent)]">
              <Star className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-[var(--color-foreground)] tabular-nums leading-none">
                {meta.rating.toFixed(1)}
              </p>
              <p className="text-[10px] text-[var(--color-warm-muted)] mt-0.5 leading-tight">
                Seller<br />Rating
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================
          4. Vendor Provenance Tags
          ================================================================ */}
      {!loading && vendor && meta.tags && meta.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-warm-muted)]">
            Provenance:
          </p>
          {meta.tags.map((tag, i) => (
            <span key={tag} className="inline-flex items-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-brass)]">
                {tag}
              </span>
              {i < meta.tags.length - 1 && (
                <span className="mx-2 h-1 w-1 rounded-full bg-[var(--color-brass)]/50" aria-hidden />
              )}
            </span>
          ))}
        </div>
      )}

      {/* ================================================================
          5. Catalog Grid Section
          ================================================================ */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-warm-border)] pb-4">
          <div>
            {loading ? (
              <Skeleton height="1.75rem" width="12rem" className="rounded" />
            ) : (
              <h2 className="font-display text-2xl font-bold text-[var(--color-foreground)]">
                Storefront Collection
              </h2>
            )}
            {!loading && (
              <p className="text-xs text-[var(--color-warm-muted)] mt-0.5">
                Browse all authentic items fulfilled directly by {vendor?.name ?? "this vendor"}
              </p>
            )}
          </div>
          {!loading && (
            <span className="text-xs font-semibold text-[var(--color-warm-muted)]">
              {products.length} {products.length === 1 ? "Item" : "Items"}
            </span>
          )}
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
