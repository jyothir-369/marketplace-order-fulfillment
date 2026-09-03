/**
 * ProductCard — glassmorphic product tile for the buyer catalog (§3.1.2).
 *
 * Composition:
 *   - Image placeholder (hero area, aspect 4:3)
 *   - Product name + vendor name
 *   - Formatted price (`formatCurrency`) + inventory StatusBadge
 *   - Quick-add quantity stepper
 *
 * The card is intentionally dumb — quantity, add-to-cart, and add feedback
 * are all driven by the parent (CatalogGrid / products page) so the same
 * card can be reused in wishlists or search results.
 */

"use client";

import Link from "next/link";
import { Minus, Plus, Package, ShoppingCart, Check } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Product } from "@/lib/api";

interface ProductCardProps {
  product: Product;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onAdd: () => void;
  /** When true, the add button shows a checkmark and emerald tint for ~2s. */
  justAdded?: boolean;
}

export function ProductCard({
  product,
  quantity,
  onQuantityChange,
  onAdd,
  justAdded = false,
}: ProductCardProps) {
  const isOut = product.stockCount === 0;

  // Decide which stock badge to render. Mirrors backend OrderStatus vocabulary
  // so we can reuse the same StatusBadge / colour tokens.
  const stockStatus: "fulfilled" | "fulfilling" | "cancelled" =
    isOut ? "cancelled" : product.stockCount <= 5 ? "fulfilling" : "fulfilled";
  const stockLabel =
    isOut
      ? "Out of stock"
      : product.stockCount <= 5
        ? `Only ${product.stockCount} left`
        : "In stock";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl",
        "glass-panel transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_hsl(var(--color-foreground)/0.12)]",
        justAdded && "ring-2 ring-[var(--color-info)]"
      )}
    >
      {/* Image placeholder */}
      <Link
        href={`/products/${product.id}`}
        className="block relative aspect-[4/3] overflow-hidden bg-[var(--color-muted)]"
        aria-label={`View ${product.name}`}
      >
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-gradient-to-br from-[var(--color-muted)] to-[var(--color-secondary)]",
            "text-[var(--color-muted-foreground)]"
          )}
        >
          <Package className="h-12 w-12" aria-hidden />
        </div>
        {/* Status pill — floating top-right */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={stockStatus} label={stockLabel} size="sm" />
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          href={`/products/${product.id}`}
          className="text-sm font-semibold leading-snug text-[var(--color-foreground)] hover:text-[var(--color-primary)] line-clamp-2"
        >
          {product.name}
        </Link>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          by {product.vendorName}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-xl font-bold text-[var(--color-foreground)] tabular-nums">
            {formatCurrency(product.price)}
          </span>
        </div>
      </div>

      {/* Quick-add footer */}
      <div
        className={cn(
          "flex items-center gap-2 border-t px-4 py-3",
          "border-[var(--color-border)] bg-[var(--color-card)]/60"
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
              "border-[var(--color-border)] bg-[var(--color-background)]",
              "hover:bg-[var(--color-accent)]",
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
              "border-[var(--color-border)] bg-[var(--color-background)]",
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
              "border-[var(--color-border)] bg-[var(--color-background)]",
              "hover:bg-[var(--color-accent)]",
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
                ? "bg-[var(--color-success)] text-[var(--color-success-foreground)]"
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
