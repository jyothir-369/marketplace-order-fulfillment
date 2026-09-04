/**
 * StorefrontHeader — sticky top bar for the buyer storefront.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Store, Package, ShoppingBag, type LucideIcon } from "lucide-react";
import {
  useCartStore,
  selectTotalItems,
} from "@/context/CartStore";
import { useCartHydration } from "@/lib/hooks/use-cart-hydration";
import { cn } from "@/lib/utils";

const NAV_LINKS: Array<{
  href: string;
  label: string;
  Icon: LucideIcon;
}> = [
  { href: "/products", label: "Catalog", Icon: Package },
  { href: "/vendors",  label: "Vendors",  Icon: Store },
  { href: "/orders",   label: "Orders",   Icon: ShoppingBag },
];

export function StorefrontHeader() {
  const pathname = usePathname();
  const hydrated = useCartHydration();
  const totalItems = useCartStore(selectTotalItems);
  const openDrawer = useCartStore((s) => s.openDrawer);

  return (
    <header className="sticky top-0 z-40 glass-panel-strong border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-6 shrink-0">
          <Link
            href="/products"
            className={cn(
              "flex items-center gap-2 font-bold text-[var(--color-foreground)]",
              "hover:opacity-80 transition-opacity"
            )}
          >
            <Store className="h-5 w-5 text-[var(--color-primary)]" aria-hidden />
            <span className="hidden sm:inline">Marketplace</span>
          </Link>

          <nav aria-label="Primary" className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium",
                    "transition-colors duration-150",
                    isActive
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: cart trigger */}
        <div className="flex items-center gap-2">
          {/* Mobile nav — icon-only links */}
          <nav aria-label="Mobile navigation" className="flex sm:hidden items-center gap-1">
            {NAV_LINKS.map(({ href, label, Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium",
                    "transition-colors duration-150",
                    isActive
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                  )}
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </Link>
              );
            })}
          </nav>

          {/* Checkout link */}
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
