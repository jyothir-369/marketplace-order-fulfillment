/**
 * app/(storefront)/products/[id]/page.tsx — Product Detail Page.
 *
 * V2 Premium treatment:
 *   - Editorial section eyebrow ("PRODUCT DETAIL") in brass uppercase
 *   - Serif H1 product name (Playfair Display via font-display)
 *   - Vendor eyebrow with brass rule accent
 *   - "Ships from [Vendor]" callout in forest green
 *   - PhotoBlock gallery (replacing the raw zinc image placeholder)
 *   - Warm ivory purchase panel with warm border
 *   - Brass "Add to Cart" CTA
 *   - Ink-navy "Buy Now" outline CTA
 *   - Warm hairline dividers, V2 shadow on panels
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag, Heart, ChevronRight, Lock, ShieldCheck, Truck } from "lucide-react";
import { getProductById, type Product } from "@/lib/api";
import { useCartStore } from "@/context/CartStore";
import { InventoryLockIndicator } from "@/components/order/InventoryLockIndicator";
import { PhotoBlock } from "@/components/ui/photo-block";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function categoryToPalette(category: string | null | undefined): Parameters<typeof PhotoBlock>[0]["category"] {
  if (!category) return "neutral";
  const c = category.toLowerCase();
  if (c.includes("electronic")) return "electronics";
  if (c.includes("apparel") || c.includes("clothing")) return "apparel";
  if (c.includes("home") || c.includes("living") || c.includes("kitchen")) return "home";
  if (c.includes("outdoor") || c.includes("garden")) return "outdoors";
  if (c.includes("food") || c.includes("grocery")) return "grocery";
  if (c.includes("beauty") || c.includes("cosmetic")) return "beauty";
  if (c.includes("book")) return "books";
  return "neutral";
}

function PDPInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { push: toast } = useToast();
  const productId = params?.id ?? "";
  const addToCart = useCartStore((s) => s.addToCart);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      setProduct(await getProductById(productId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  const clampedQty = Math.max(1, Math.min(quantity, product?.stockCount ?? 1));
  const isOutOfStock = !product || product.stockCount === 0 || !product.isActive;

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: clampedQty,
      maxStock: product.stockCount,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
    });
    setAddedToCart(true);
    toast(`${product.name} added to cart.`, "success");
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: clampedQty,
      maxStock: product.stockCount,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
    });
    router.push("/checkout");
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Skeleton className="h-4 w-24 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <Skeleton className="h-96 rounded-xl" />
          <div className="space-y-5 pt-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-12 mt-4" />
            <Skeleton className="h-12" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <EmptyState
          icon={<ArrowLeft size={40} aria-hidden />}
          title="Product not found"
          description={error ?? "This product does not exist or has been removed."}
          action={
            <Link
              href="/products"
              className={cn(
                "px-5 py-2.5 rounded-md font-medium",
                "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
                "hover:opacity-90 transition-opacity"
              )}
            >
              Back to Catalog
            </Link>
          }
        />
      </div>
    );
  }

  const palette = categoryToPalette(product.category);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Back link */}
      <Link
        href="/products"
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium",
          "text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)]",
          "transition-colors mb-8"
        )}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to Catalog
      </Link>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs text-[var(--color-warm-muted)] mb-4">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[var(--color-foreground)]">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/products" className="hover:text-[var(--color-foreground)]">Shop</Link></li>
          <li aria-hidden>/</li>
          <li className="text-[var(--color-foreground)] font-medium truncate max-w-[200px]">{product.name}</li>
        </ol>
      </nav>

      {/* Editorial eyebrow */}
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)] mb-1">
        {product.category ?? "Product Detail"}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left: PhotoBlock gallery + thumbnails */}
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-4">
              <PhotoBlock
                category={palette}
                label={`${product.name} product image`}
                accent
                square={false}
                className="rounded-xl border border-[var(--color-border)] shadow-v2"
              />
            </div>
            {[1,2,3].map((i) => (
              <div key={i} className="aspect-square rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] overflow-hidden">
                <PhotoBlock category={palette} label={`${product.name} thumbnail ${i}`} square className="rounded-lg w-full h-full" />
              </div>
            ))}
          </div>
          {/* Specs */}
          {product.description && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-v2">
              <h3 className="font-display text-sm font-bold text-[var(--color-foreground)] mb-2">Details</h3>
              <p className="text-sm text-[var(--color-warm-muted)] leading-relaxed">{product.description}</p>
            </div>
          )}
          {/* Ships-from callout */}
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg",
              "bg-[var(--color-forest)]/8 border border-[var(--color-forest)]/20"
            )}
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-forest)]" />
            <p className="text-xs font-medium text-[var(--color-forest)]">
              Ships from&nbsp;<span className="font-semibold">{product.vendorName}</span>
            </p>
          </div>
        </div>

        {/* Right: purchase panel */}
        <div
          className={cn(
            "rounded-xl border border-[var(--color-border)]",
            "bg-[var(--color-card)] shadow-v2",
            "flex flex-col gap-5 p-6"
          )}
        >
          {/* Vendor eyebrow with brass rule */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              {product.vendorName}
            </p>
            <span aria-hidden className="mt-1 block h-px w-8 bg-[var(--color-accent)]" />
          </div>

          {/* Product name */}
          <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)] leading-tight">
            {product.name}
          </h1>

          {/* Price */}
          <p className="font-display text-4xl font-bold text-[var(--color-foreground)] tabular-nums">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(product.price)}
          </p>

          {/* Vendor profile card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-v2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--color-ink-navy)] to-[var(--color-navy-deep)] flex items-center justify-center text-white font-display text-sm font-bold">
                {product.vendorName?.charAt(0)?.toUpperCase() ?? "V"}
              </div>
              <div>
                <Link href={`/vendors/${product.vendorId}`} className="font-display text-sm font-bold text-[var(--color-foreground)] hover:text-[var(--color-brass)] transition-colors">
                  {product.vendorName}
                </Link>
                <p className="text-[11px] text-[var(--color-warm-muted)]">Verified Seller</p>
              </div>
            </div>
          </div>

          {/* Wishlist action */}
          <button
            type="button"
            onClick={() => setIsWishlisted((v) => !v)}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={cn(
              "w-full py-2.5 rounded-xl font-medium text-sm border transition-colors flex items-center justify-center gap-2",
              isWishlisted
                ? "bg-[var(--color-ink-navy)] text-[var(--color-brass)] border-[var(--color-brass)]/30"
                : "bg-transparent text-[var(--color-foreground)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
            )}
          >
            <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} aria-hidden />
            {isWishlisted ? "Saved to Wishlist" : "Save to Wishlist"}
          </button>

          {/* Inventory indicator */}
          <InventoryLockIndicator stockCount={product.stockCount} />

          {/* Quantity stepper */}
          {!isOutOfStock && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--color-foreground)]">
                Qty:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={clampedQty <= 1}
                  onClick={() => setQuantity((q) => q - 1)}
                  className={cn(
                    "h-9 w-9 flex items-center justify-center rounded-md border text-base font-medium",
                    "border-[var(--color-border)] bg-[var(--color-card)]",
                    "hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
                    "disabled:opacity-40 disabled:pointer-events-none"
                  )}
                >
                  &minus;
                </button>
                <input
                  type="number"
                  min={1}
                  max={product.stockCount}
                  value={quantity}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setQuantity(Number.isNaN(n) ? 1 : n);
                  }}
                  className={cn(
                    "h-9 w-14 text-center rounded-md border text-sm tabular-nums",
                    "border-[var(--color-border)] bg-[var(--color-card)]"
                  )}
                  aria-label="Quantity"
                />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={clampedQty >= product.stockCount}
                  onClick={() => setQuantity((q) => q + 1)}
                  className={cn(
                    "h-9 w-9 flex items-center justify-center rounded-md border text-base font-medium",
                    "border-[var(--color-border)] bg-[var(--color-card)]",
                    "hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
                    "disabled:opacity-40 disabled:pointer-events-none"
                  )}
                >
                  +
                </button>
              </div>
              <span className="text-xs text-[var(--color-warm-subtle)]">
                {product.stockCount} available
              </span>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className={cn(
                "w-full py-3.5 rounded-xl font-semibold text-sm",
                "flex items-center justify-center gap-2",
                "transition-colors duration-150",
                isOutOfStock
                  ? "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-not-allowed"
                  : addedToCart
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                    : "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90"
              )}
            >
              {isOutOfStock
                ? "Out of Stock"
                : addedToCart
                  ? "\u2713 Added to Cart"
                  : "Add to Cart"}
            </button>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleBuyNow}
              className={cn(
                "w-full py-3.5 rounded-xl font-semibold text-sm",
                "flex items-center justify-center gap-2",
                "border transition-colors duration-150",
                isOutOfStock
                  ? "border-[var(--color-border)] bg-transparent text-[var(--color-muted-foreground)] cursor-not-allowed"
                  : "border-[var(--color-primary)] bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)]"
              )}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden />
              Buy Now
            </button>
          </div>
        </div>

        {/* Trust / delivery info */}
        <div className="flex items-center gap-4 text-xs text-[var(--color-warm-subtle)] mt-4">
          <span className="inline-flex items-center gap-1"><Lock size={12} aria-hidden /> Secure checkout</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck size={12} aria-hidden /> Verified vendor</span>
          <span className="inline-flex items-center gap-1"><Truck size={12} aria-hidden /> Tracked delivery</span>
        </div>

        {/* Below grid: reviews stub, related products, recently viewed */}
        <section aria-label="Related products" className="mt-10 border-t border-[var(--color-border)] pt-8">
          <h2 className="font-display text-xl font-bold text-[var(--color-foreground)] mb-4">Related products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Link key={i} href="/products" className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-v2 hover:shadow-sm transition-shadow">
                <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-muted)] mb-3" aria-hidden />
                <p className="text-sm font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-brass)] transition-colors">Related item {i}</p>
                <p className="text-xs text-[var(--color-warm-muted)]">Explore similar products</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-ink-navy)] mt-2">
                  View <ChevronRight className="h-3 w-3" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="Recently viewed" className="mt-8 border-t border-[var(--color-border)] pt-8">
          <h2 className="font-display text-xl font-bold text-[var(--color-foreground)] mb-4">Recently viewed</h2>
          <p className="text-sm text-[var(--color-warm-muted)]">Add products to build your recently viewed list.</p>
        </section>

        <section aria-label="Reviews" className="mt-12 border-t border-[var(--color-border)] pt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-[var(--color-foreground)]">Reviews</h2>
            <span className="text-xs text-[var(--color-warm-muted)]">0 reviews</span>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 text-center text-sm text-[var(--color-warm-muted)]">
            No reviews yet. Be the first to share your experience with this product.
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <ToastProvider>
      <PDPInner />
    </ToastProvider>
  );
}