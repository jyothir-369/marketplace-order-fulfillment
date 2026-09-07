/**
 * QuickViewModal — fast product preview for the catalog (§V2 Premium).
 *
 * Opens as a centered Radix Dialog so shoppers can inspect a product
 * without leaving the catalog page. Mirrors CartDrawer's accessibility
 * baseline (focus trap, ESC-to-close, scroll lock, aria-modal).
 *
 * Layout:
 *   - Left  : full PhotoBlock using the product's category palette
 *   - Right : editorial metadata + quantity stepper + dual CTA
 *
 * Visual treatment matches the V2 Premium language:
 *   - Warm ivory card surface with hairline warm border
 *   - Brass underline rule for "View full details"
 *   - Ink navy primary CTA "Add to Bag"
 *   - Playfair Display serif product name
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ShoppingCart, Plus, Minus, ArrowRight, ShieldCheck, Truck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogOverlay,
  DialogTitle,
} from "@radix-ui/react-dialog";
import { PhotoBlock, type PhotoBlockCategory } from "@/components/ui/photo-block";
import { formatCurrency, cn } from "@/lib/utils";
import type { Product } from "@/lib/api";

/* Free-text category -> PhotoBlock palette preset (mirrors ProductCard). */
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

interface QuickViewModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (productId: string, quantity: number) => void;
}

export function QuickViewModal({ product, open, onOpenChange, onAdd }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);

  // Reset quantity to 1 whenever a new product is shown.
  useEffect(() => {
    if (open) setQuantity(1);
  }, [open, product?.id]);

  if (!product) return null;

  const palette = categoryToPalette(product.category);
  const isOut = product.stockCount === 0;
  const isScarcity = product.stockCount > 0 && product.stockCount <= 5;
  const initial = product.name.charAt(0).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay
        className={cn(
          "fixed inset-0 z-50 bg-[var(--color-foreground)]/30 backdrop-blur-sm",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:duration-200 data-[state=open]:duration-300"
        )}
      />

      <DialogContent
        className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-[min(960px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto",
          "rounded-2xl shadow-v2-lg focus:outline-none",
          "bg-[var(--color-card)] border border-[var(--color-warm-border)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          "data-[state=closed]:duration-200 data-[state=open]:duration-300"
        )}
        aria-label={`Quick view of ${product.name}`}
      >
        <DialogTitle className="sr-only">{product.name} quick view</DialogTitle>

        {/* Close button */}
        <DialogClose asChild>
          <button
            type="button"
            className={cn(
              "absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md",
              "text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)]",
              "hover:bg-[var(--color-ivory-hover)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]"
            )}
            aria-label="Close quick view"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </DialogClose>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: PhotoBlock */}
          <div className="relative">
            <PhotoBlock
              category={palette}
              square={false}
              label={`${product.name} image`}
              className="h-72 md:h-full border-0 rounded-l-2xl rounded-r-none md:rounded-r-none"
            />

            {/* Initial monogram overlay (mirrors ProductCard) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="font-display text-[8rem] font-bold text-white/15 leading-none">
                {initial}
              </span>
            </div>

            {/* Stock pill in lower-left */}
            <div className="absolute bottom-4 left-4">
              {isOut ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-cream)] px-3 py-1 border border-[var(--color-warm-border)] shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warm-subtle)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-warm-muted)]">
                    Out of Stock
                  </span>
                </span>
              ) : isScarcity ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ink-navy)] px-3 py-1 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary-foreground)]">
                    Only {product.stockCount} left
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-cream)] px-3 py-1 border border-[var(--color-warm-border)] shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-forest)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-navy)]">
                    In Stock
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Right: metadata + CTAs */}
          <div className="flex flex-col gap-5 p-6 sm:p-8">
            {/* Eyebrow */}
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brass)]">
              {product.category ?? "Marketplace"}
            </p>

            {/* Title */}
            <h2 className="font-display text-3xl font-bold leading-tight text-[var(--color-foreground)]">
              {product.name}
            </h2>

            {/* Vendor */}
            <p className="text-sm text-[var(--color-warm-muted)]">
              by{" "}
              <Link
                href={`/vendors/${product.vendorId}`}
                onClick={() => onOpenChange(false)}
                className="font-semibold text-[var(--color-foreground)] hover:text-[var(--color-brass)] transition-colors underline-offset-4 hover:underline"
              >
                {product.vendorName}
              </Link>
            </p>

            {/* Price */}
            <p className="font-display text-3xl font-bold tabular-nums text-[var(--color-ink-navy)]">
              {formatCurrency(product.price)}
            </p>

            {/* Trust microcopy */}
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--color-warm-muted)]">
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-brass)]" aria-hidden />
                Verified Seller
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-[var(--color-brass)]" aria-hidden />
                Fast Dispatch
              </li>
            </ul>

            {/* Quantity stepper */}
            {!isOut && (
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-[var(--color-warm-muted)] uppercase tracking-wide">
                  Qty
                </span>
                <div className="inline-flex items-center rounded-full border border-[var(--color-warm-border)] bg-[var(--color-card)] shadow-xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-2 text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-ivory-hover)] disabled:opacity-30 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <span className="px-4 py-2 font-bold text-[var(--color-foreground)] tabular-nums text-sm min-w-[2.5rem] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.min(product.stockCount, q + 1))
                    }
                    disabled={quantity >= product.stockCount}
                    className="px-3 py-2 text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-ivory-hover)] disabled:opacity-30 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="mt-auto flex flex-col gap-3 pt-2">
              <button
                type="button"
                disabled={isOut}
                onClick={() => {
                  onAdd(product.id, quantity);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold",
                  "border focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-2",
                  "transition-all duration-200",
                  isOut
                    ? "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-not-allowed border-transparent"
                    : "bg-[#16233f] text-white hover:bg-[#1e2f52] border-[#16233f]"
                )}
              >
                <ShoppingCart className="h-4 w-4" aria-hidden />
                Add to Bag
              </button>

              <Link
                href={`/products/${product.id}`}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "group inline-flex items-center justify-center gap-1.5 h-10 w-full",
                  "text-sm font-semibold text-[var(--color-ink-navy)]",
                  "border-b border-[var(--color-brass)]/60 pb-1",
                  "hover:text-[var(--color-brass)] hover:border-[var(--color-brass)]",
                  "transition-colors duration-150"
                )}
              >
                View full details
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
