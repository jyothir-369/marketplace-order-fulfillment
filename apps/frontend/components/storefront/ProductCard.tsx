/**
 * ProductCard — luxury editorial storefront tile for the buyer catalog.
 *
 * V2 Premium upgrade (mirrors VendorCard):
 *   - Rich signature gradient banner per product category
 *   - Elevated brand emblem pill with product-category gradient
 *   - Verified stock status badge with forest-green pulse dot
 *   - Wishlist heart — saves to localStorage via useWishlistStore
 *   - Quick-View eye — opens a centered modal with full product preview
 *   - Editorial eyebrow label + serif product name
 *   - Slide-up CTA footer with brass border accents
 *   - Hover lift: -translateY(-1.5px) + shadow-v2-lg + brass border
 */

"use client";

import Link from "next/link";
import { ShoppingCart, Check, Package } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useState } from "react";
import { type PhotoBlockCategory } from "@/components/ui/photo-block";
import { useWishlistStore } from "@/lib/hooks/use-wishlist";
import { QuickViewModal } from "@/components/storefront/QuickViewModal";
import type { Product } from "@/lib/api";


interface ProductCardProps {
  product: Product;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onAdd: () => void;
  /** When true, the add button shows a checkmark and brass tint for ~2s. */
  justAdded?: boolean;
}

/** Per-category signature gradient for the header banner. */

/** Wishlist heart — inline SVG to avoid lucide-react v1.39.0 type conflicts */
function WishlistHeartIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14" height="14" viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

/** Quick-view eye — inline SVG to avoid lucide-react v1.39.0 type conflicts */
function QuickViewEyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14" height="14" viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
const CATEGORY_GRADIENTS: Record<string, string> = {
  neutral:     "from-[var(--color-ivory-muted)] to-[var(--color-cream)]",
  electronics: "from-[#b8c8d8] via-[#9aafc0] to-[#7a9ab0]",
  apparel:     "from-[#d4b89a] via-[#c0a07e] to-[#a88862]",
  home:        "from-[#b8c8b0] via-[#98b090] to-[#789870]",
  outdoors:    "from-[#a8d0b8] via-[#88c098] to-[#68a878]",
  grocery:     "from-[#d8c890] via-[#c8b870] to-[#b8a850]",
  beauty:      "from-[#d8a8b8] via-[#c890a0] to-[#b87888]",
  books:       "from-[#b0a8d0] via-[#9088c0] to-[#7068b0]",
};

/** Secondary (hover) gradient layer — lighter, brighter variant for the cross-fade. */
const HOVER_GRADIENTS: Record<string, string> = {
  neutral:     "from-[#faf7f1] via-[#f5f0e8] to-[#ebe5d6]",
  electronics: "from-[#d8e4f0] via-[#c0d0e0] to-[#a8bcd0]",
  apparel:     "from-[#e8d4bc] via-[#d4be9c] to-[#c0a880]",
  home:        "from-[#d8e0d0] via-[#b8c8b0] to-[#98b098]",
  outdoors:    "from-[#c8e0c8] via-[#a8d0a8] to-[#88c088]",
  grocery:     "from-[#e8d8a0] via-[#d8c880] to-[#c8b860]",
  beauty:      "from-[#e8c0d0] via-[#d8a8b8] to-[#c890a0]",
  books:       "from-[#c8c0e0] via-[#a8a0d0] to-[#8880c0]",
};

/**
 * Map a free-text product category onto a PhotoBlock palette preset.
 * Falls back to "neutral" for unknown categories.
 */
function categoryToPalette(category: string | null | undefined): PhotoBlockCategory {
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

export function ProductCard({
  product,
  quantity,
  onQuantityChange,
  onAdd,
  justAdded = false,
}: ProductCardProps) {
  const isOut = product.stockCount === 0;
  const isScarcity = product.stockCount > 0 && product.stockCount <= 5;
  const palette = categoryToPalette(product.category);
  const gradient = CATEGORY_GRADIENTS[palette] ?? CATEGORY_GRADIENTS.neutral;
  const hoverGradient = HOVER_GRADIENTS[palette] ?? HOVER_GRADIENTS.neutral;
  const initial = product.name.charAt(0).toUpperCase();

  // Wishlist (Saved Items) — localStorage-backed via Zustand persist
  const isWishlisted = useWishlistStore((s) => s.items.includes(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);

  // Quick-View modal — local state; the parent card is a <Link>, so the
  // trigger calls e.stopPropagation() to avoid navigation.
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  return (
    <>
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl",
        "bg-[var(--color-card)]",
        "border border-[var(--color-warm-border)]",
        "shadow-v2 transition-all duration-300 ease-out",
        "hover:-translate-y-1.5 hover:shadow-v2-lg hover:border-[var(--color-brass)]/60",
        justAdded && "ring-2 ring-[var(--color-brass)]"
      )}
      aria-label={`${product.name} by ${product.vendorName}`}
    >
      {/* 1. Rich Signature Header Banner */}
      <div
        className={cn(
          "relative h-28 w-full overflow-hidden bg-gradient-to-r",
          gradient
        )}
        aria-hidden
      >
        {/* Subtle mesh overlay */}
        <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />

        {/* Secondary hover gradient layer — cross-fades in on group-hover */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity duration-500 ease-out",
            "group-hover:opacity-100",
            hoverGradient
          )}
          aria-hidden
        />

        {/* Decorative watermark glyph (top layer — above both gradients) */}
        <div className="absolute -right-4 -bottom-6 opacity-20 text-white pointer-events-none select-none">
          <span className="font-display text-[5rem] leading-none transform -rotate-12">
            {initial}
          </span>
        </div>

        {/* Top badges row: scarcity / stock pill (left) + wishlist heart (right) */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          {/* Stock pill — left slot */}
          {isOut ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-cream)] px-2.5 py-1 border border-[var(--color-warm-border)] shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warm-subtle)]" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-warm-muted)]">
                Out of Stock
              </span>
            </div>
          ) : isScarcity ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ink-navy)] px-2.5 py-1 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary-foreground)]">
                Only {product.stockCount} left
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-cream)] px-2.5 py-1 border border-[var(--color-warm-border)] shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-forest)]" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-navy)]">
                In Stock
              </span>
            </div>
          )}

          {/* Quick-View eye — opens the centered modal; stops propagation so it does not navigate to PDP */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setQuickViewOpen(true);
            }}
            aria-label={`Quick view of ${product.name}`}
            className={cn(
              "shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full",
              "bg-black/20 backdrop-blur-xs",
              "border border-white/20",
              "text-white/80 hover:text-white hover:bg-black/35",
              "transition-all duration-200 ease-out hover:scale-105",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-1 focus:ring-offset-black/20"
            )}
          >
            <QuickViewEyeIcon className="h-3.5 w-3.5" />
          </button>

          {/* Wishlist heart — right slot; stops propagation so it does not navigate to PDP */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              toggleWishlist(product.id);
            }}
            aria-label={isWishlisted ? `Remove ${product.name} from saved items` : `Save ${product.name} to wishlist`}
            aria-pressed={isWishlisted}
            className={cn(
              "shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full",
              "bg-black/20 backdrop-blur-xs",
              "border border-white/20",
              "transition-all duration-200 ease-out",
              "hover:bg-black/35 hover:scale-105",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-1 focus:ring-offset-black/20",
              isWishlisted
                ? "text-[var(--color-brass)] fill-[var(--color-brass)]"
                : "text-white/80 hover:text-white"
            )}
          >
            <WishlistHeartIcon
              className={cn("h-3.5 w-3.5 transition-transform duration-200", isWishlisted && "scale-110")}
              filled={isWishlisted}
            />
          </button>
        </div>

        {/* Product count badge */}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-black/50 text-white/90 backdrop-blur-md border border-white/20">
          <Package className="h-3 w-3 text-[var(--color-brass)]" aria-hidden />
          {product.stockCount} units
        </span>
      </div>

      {/* 2. Body */}
      <div className="px-5 pt-0 pb-5 flex flex-col flex-1 gap-1.5">
        {/* Elevated brand emblem + price pill */}
        <div className="flex items-end justify-between -mt-9 mb-2.5">
          {/* Elevated brand monogram */}
          <div
            className={cn(
              "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0",
              "bg-gradient-to-br from-[var(--color-ink-navy)] to-[var(--color-navy-deep)]",
              "shadow-md ring-4 ring-[var(--color-card)]"
            )}
            aria-hidden
          >
            <span className="font-display text-xl font-bold text-white leading-none">
              {initial}
            </span>
          </div>

          {/* Price pill */}
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-[var(--color-cream)] border border-[var(--color-warm-border)] text-[var(--color-ink-navy)] shadow-xs">
            {formatCurrency(product.price)}
          </span>
        </div>

        {/* Category eyebrow */}
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brass)]">
          {product.category ?? "Marketplace"}
        </p>

        {/* Product name */}
        <Link
          href={`/products/${product.id}`}
          className={cn(
            "font-display text-xl font-bold leading-snug",
            "text-[var(--color-foreground)]",
            "hover:text-[var(--color-brass)] transition-colors duration-150",
            "line-clamp-2"
          )}
        >
          {product.name}
        </Link>

        {/* Vendor name */}
        <p className="text-xs text-[var(--color-warm-muted)]">
          by {product.vendorName}
        </p>

        {/* Quantity selector */}
        {!isOut && (
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[11px] font-semibold text-[var(--color-warm-muted)] uppercase tracking-wide">
              Qty
            </span>
            <div className="inline-flex items-center rounded-full border border-[var(--color-warm-border)] bg-[var(--color-card)] shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="px-3 py-1 text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-ivory-hover)] disabled:opacity-30 transition-colors text-sm font-medium"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="px-3 py-1 font-bold text-[var(--color-foreground)] tabular-nums text-sm">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(Math.min(product.stockCount, quantity + 1))}
                disabled={quantity >= product.stockCount}
                className="px-3 py-1 text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-ivory-hover)] disabled:opacity-30 transition-colors text-sm font-medium"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* 3. Action Footer — slide-up CTA with brass border */}
        <div
          className={cn(
            "mt-auto pt-4 pb-1",
            "border-t border-[var(--color-brass)]/50",
            "transition-all duration-300 ease-out",
            "transform translate-y-1 group-hover:translate-y-0"
          )}
        >
          <button
            type="button"
            disabled={isOut}
            onClick={onAdd}
            className={cn(
              "flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold",
              "transition-all duration-200",
              "border focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-2",
              isOut
                ? "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-not-allowed border-transparent"
                : justAdded
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] border-[var(--color-brass)] shadow-sm"
                  : "bg-[#16233f] text-white hover:bg-[#1e2f52] border-[#16233f]"
            )}
          >
            {justAdded ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                Added to cart
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" aria-hidden />
                Add to cart
              </>
            )}
          </button>
        </div>
      </div>
    </article>

    <QuickViewModal
      product={product}
      open={quickViewOpen}
      onOpenChange={setQuickViewOpen}
      onAdd={(_id, qty) => {
        onQuantityChange(qty);
        onAdd();
      }}
    />
    </>
  );
}
