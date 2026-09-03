/**
 * StorefrontHeader — sticky top bar for the buyer storefront (§2.2).
 *
 * Composition:
 *   - logo on the left (links to /products)
 *   - primary navigation (Catalog)
 *   - hydrated cart counter on the right (links to /checkout)
 *
 * The cart counter is gated on `useCartHydration()` so the rendered
 * badge is identical between SSR and client (GAP-F10).
 */

"use client";

import Link from "next/link";
import { ShoppingCart, Store } from "lucide-react";
import {
  useCartStore,
  selectTotalItems,
} from "@/context/CartStore";
import { useCartHydration } from "@/lib/hooks/use-cart-hydration";

export function StorefrontHeader() {
  const hydrated = useCartHydration();
  const totalItems = useCartStore(selectTotalItems);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-zinc-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/products"
            className="flex items-center gap-2 font-bold text-zinc-900 hover:text-indigo-600 transition-colors"
          >
            <Store className="h-5 w-5" aria-hidden />
            <span>Marketplace</span>
          </Link>
          <nav aria-label="Primary" className="hidden sm:block">
            <Link
              href="/products"
              className="text-sm text-zinc-700 hover:text-zinc-900"
            >
              Catalog
            </Link>
          </nav>
        </div>

        <Link
          href="/checkout"
          className="relative inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
          aria-label={
            hydrated
              ? `View cart (${totalItems} items)`
              : "View cart"
          }
        >
          <ShoppingCart className="h-4 w-4" aria-hidden />
          <span>Cart</span>
          {hydrated && (
            <span
              className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-white text-indigo-700 text-xs font-bold"
              data-testid="cart-counter"
            >
              {totalItems}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
