/**
 * StorefrontHeader — sticky top bar for the buyer storefront (§2.2).
 *
 * Composition:
 *   - logo on the left (links to /products)
 *   - primary navigation (Catalog)
 *   - cart trigger with live counter badge (opens CartDrawer)
 *   - hydrated cart counter driven by useCartStore
 *
 * The cart counter is gated on `useCartHydration()` so the rendered
 * badge is identical between SSR and client (GAP-F10).
 *
 * The sticky bar uses the `.glass-panel` class for glassmorphism.
 * CartDrawer is opened via `useCartStore(openDrawer)`.
 */

"use client";

import Link from "next/link";
import { ShoppingCart, Store } from "lucide-react";
import {
  useCartStore,
  selectTotalItems,
} from "@/context/CartStore";
import { useCartHydration } from "@/lib/hooks/use-cart-hydration";
import { cn } from "@/lib/utils";

export function StorefrontHeader() {
  const hydrated = useCartHydration();
  const totalItems = useCartStore(selectTotalItems);
  const openDrawer = useCartStore((s) => s.openDrawer);

  return (
    <header className="sticky top-0 z-40 glass-panel-strong">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-6">
          <Link
            href="/products"
            className={cn(
              "flex items-center gap-2 font-bold text-[var(--color-foreground)]",
              "hover:opacity-80 transition-opacity"
            )}
          >
            <Store className="h-5 w-5 text-[var(--color-primary)]" aria-hidden />
            <span>Marketplace</span>
          </Link>
          <nav aria-label="Primary" className="hidden sm:block">
            <Link
              href="/products"
              className={cn(
                "text-sm text-[var(--color-muted-foreground)]",
                "hover:text-[var(--color-foreground)] transition-colors"
              )}
            >
              Catalog
            </Link>
          </nav>
        </div>

        {/* Right: cart trigger */}
        <div className="flex items-center gap-3">
          {/* Direct /checkout link */}
          <Link
            href="/checkout"
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              "border border-[var(--color-border)] text-[var(--color-foreground)]",
              "hover:bg-[var(--color-accent)] transition-colors"
            )}
          >
            Checkout
          </Link>

          {/* Cart drawer trigger */}
          <button
            type="button"
            onClick={openDrawer}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
              "hover:opacity-90 transition-opacity",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ring)]"
            )}
            aria-label={
              hydrated
                ? `Open cart (${totalItems} item${totalItems !== 1 ? "s" : ""})`
                : "Open cart"
            }
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Cart</span>
            {hydrated && totalItems > 0 && (
              <span
                className={cn(
                  "ml-1 inline-flex items-center justify-center",
                  "min-w-[1.25rem] h-5 px-1 rounded-full",
                  "bg-[var(--color-info)] text-white text-xs font-bold tabular-nums"
                )}
                data-testid="cart-counter"
                aria-live="polite"
              >
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
