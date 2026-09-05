/**
 * ProductCard — V2 Premium product tile for the buyer catalog.
 *
 * V2 visual treatment:
 *   - PhotoBlock (warm gradient) instead of flat gray hex placeholder
 *   - Brass vendor eyebrow above the serif product name
 *   - Floating stock badge uses semantic StatusBadge palette (forest for
 *     "in stock", clay for "only N left", gray for out of stock) — we
 *     reuse the existing StatusBadge component for status colors; the
 *     "Only N left" variant here maps to FULFILLING (amber) so the
 *     vocabulary stays consistent.
 *   - "Add" button uses ink-navy primary; "Added" success state uses
 *     brass accent.
 *   - Warm hairline borders, V2 shadow on lift.
 */

"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { PhotoBlock, type PhotoBlockCategory } from "@/components/ui/photo-block";
import type { Product } from "@/lib/api";

interface ProductCardProps {
  product: Product;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onAdd: () => void;
  /** When true, the add button shows a checkmark and brass tint for ~2s. */
  justAdded?: boolean;
}

/**
 * Map a free-text product category onto one of the V2 PhotoBlock
 * palette presets. Falls back to "neutral" for unknown categories so
 * the catalog never renders a broken-looking tile.
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

  /* Stock badge: reuses the StatusBadge semantic vocabulary so colors
     stay consistent across catalog, PDP, and order views. "Only N left"
     stays amber (FULFILLING), "In stock" stays emerald (FULFILLED), and
     "Out of stock" stays gray (CANCELLED). */
  const stockStatus: "fulfilled" | "fulfilling" | "cancelled" =
    isOut ? "cancelled" : product.stockCount <= 5 ? "fulfilling" : "fulfilled";
  const stockLabel =
    isOut
      ? "Out of stock"
      : product.stockCount <= 5
        ? `Only ${product.stockCount} left`
        : "In stock";

  const palette = categoryToPalette(product.category);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl",
        "bg-[var(--color-card)]",
        "border border-[var(--color-border)]",
        "transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-v2-md",
        justAdded && "ring-2 ring-[var(--color-accent)]"
      )}
    >
      {/* Image area — V2 PhotoBlock */}
      <Link
        href={`/products/${product.id}`}
        className="block relative"
        aria-label={`View ${product.name}`}
      >
        <PhotoBlock
          category={palette}
          square
          accent
          label={`${product.name} product image`}
          className="rounded-none border-x-0 border-t-0"
        />
        {/* Status pill — floating top-right */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={stockStatus} label={stockLabel} size="sm" />
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          {product.category ?? "Marketplace"}
        </p>
        <Link
          href={`/products/${product.id}`}
          className={cn(
            "font-display text-base font-semibold leading-snug",
            "text-[var(--color-foreground)]",
            "hover:text-[var(--color-primary)]",
            "line-clamp-2"
          )}
        >
          {product.name}
        </Link>
        <p className="text-xs text-[var(--color-warm-muted)]">
          by {product.vendorName}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-display text-xl font-bold text-[var(--color-foreground)] tabular-nums">
            {formatCurrency(product.price)}
          </span>
        </div>
      </div>

      {/* Quick-add footer */}
      <div
        className={cn(
          "flex items-center gap-2 border-t px-4 py-3",
          "border-[var(--color-border)] bg-[var(--color-background)]"
        )}
      >
        <div className="flex items-center gap-1">
          <label htmlFor={`qty-${product.id}`} className="sr-only">
            Quantity for {product.name}
          </label>
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={quantity <= 1 || isOut}
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-md border text-sm font-medium",
              "border-[var(--color-border)] bg-[var(--color-card)]",
              "hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
              "disabled:opacity-40 disabled:pointer-events-none"
            )}
          >
            <Minus className="h-3.5 w-3.5" aria-hidden />
          </button>
          <input
            id={`qty-${product.id}`}
            type="number"
            min={1}
            max={product.stockCount}
            value={quantity}
            disabled={isOut}
            onChange={(e) =>
              onQuantityChange(parseInt(e.target.value, 10) || 1)
            }
            className={cn(
              "h-8 w-12 text-center rounded-md border text-sm tabular-nums",
              "border-[var(--color-border)] bg-[var(--color-card)]",
              "disabled:opacity-40"
            )}
          />
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={quantity >= product.stockCount || isOut}
            onClick={() => onQuantityChange(quantity + 1)}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-md border text-sm font-medium",
              "border-[var(--color-border)] bg-[var(--color-card)]",
              "hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
              "disabled:opacity-40 disabled:pointer-events-none"
            )}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          disabled={isOut}
          onClick={onAdd}
          className={cn(
            "flex-1 h-8 inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium",
            "transition-colors duration-150",
            isOut
              ? "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-not-allowed"
              : justAdded
                ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                : "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90"
          )}
        >
          {justAdded ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden />
              Added
            </>
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
              Add
            </>
          )}
        </button>
      </div>
    </article>
  );
}