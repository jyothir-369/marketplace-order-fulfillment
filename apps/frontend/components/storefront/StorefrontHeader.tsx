/**
 * StorefrontHeader — V2 Premium sticky top bar for the buyer storefront.
 *
 * Visual treatment:
 *   - White ivory-cream surface, warm hairline border (#e7e0d2)
 *   - Playfair Display "Marketplace" wordmark with brass dot glyph
 *   - Active nav: gold rule under the label (V2 cover pattern)
 *   - Cart count pill: brass background
 *   - Search input: ivory fill, warm border, brass focus ring
 *
 * Scope: header shell only. Catalog/PDP item cards and support
 * screens land in Phases 3 & 4.
 */

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ShoppingCart, Package, ShoppingBag, Store, Search } from "lucide-react";
import {
  useCartStore,
  selectTotalItems,
} from "@/context/CartStore";
import { useCartHydration } from "@/lib/hooks/use-cart-hydration";
import { cn } from "@/lib/utils";

const NAV_LINKS: Array<{
  href: string;
  label: string;
  Icon: typeof Package;
}> = [
  { href: "/products", label: "Shop",     Icon: Package },
  { href: "/vendors",  label: "Vendors",  Icon: Store },
  { href: "/orders",   label: "Orders",   Icon: ShoppingBag },
];

const PRIMARY = "var(--color-primary)";      /* ink navy */
const PRIMARY_FG = "var(--color-primary-foreground)"; /* ivory */
const ACCENT = "var(--color-accent)";       /* brass */
const BORDER = "var(--color-border)";       /* warm border */
const FG = "var(--color-foreground)";
const MUTED = "var(--color-muted-foreground)";
const RING = "var(--color-ring)";
const CARD = "var(--color-card)";

export function StorefrontHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    router.push("/products?q=" + encodeURIComponent(q));
  };
  const hydrated = useCartHydration();
  const totalItems = useCartStore(selectTotalItems);
  const openDrawer = useCartStore((s) => s.openDrawer);

  return (
    <header
      className={cn(
        "sticky top-0 z-40",
        "bg-[var(--color-card)]",
        "border-b border-[var(--color-border)]",
        "shadow-v2"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: brand wordmark + nav */}
        <div className="flex items-center gap-8 shrink-0">
          <Link
            href="/products"
            className={cn(
              "group inline-flex items-baseline gap-1.5",
              "text-[var(--color-foreground)]",
              "transition-opacity hover:opacity-80"
            )}
          >
            <span
              aria-hidden
              className="font-display italic font-bold text-[var(--color-accent)] text-lg leading-none translate-y-[1px]"
            >
              M
            </span>
            <span className="font-display text-xl font-bold tracking-tight">
              Marketplace
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden sm:flex items-center gap-7">
            {NAV_LINKS.map(({ href, label, Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group relative inline-flex items-center gap-1.5",
                    "text-sm font-medium",
                    "transition-colors duration-150",
                    isActive
                      ? "text-[var(--color-foreground)]"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                  {/* Active indicator: brass underline rule */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -bottom-[18px] left-0 right-0",
                      "h-[1.5px] bg-[var(--color-accent)]",
                      "transition-opacity duration-150",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                    )}
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Center: global search */}
        <form
          role="search"
          onSubmit={handleSearch}
          className={cn(
            "flex-1 max-w-md hidden md:flex relative",
            "rounded-md border border-[var(--color-border)]",
            "bg-[var(--color-background)] overflow-hidden",
            "focus-within:ring-2 focus-within:ring-[var(--color-ring)] focus-within:border-transparent"
          )}
        >
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)] pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products, vendors..."
            aria-label="Search products"
            className={cn(
              "w-full bg-transparent pl-9 pr-3 py-2 text-sm",
              "text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]",
              "focus:outline-none"
            )}
          />
        </form>

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

          {/* Account link */}
          <Link
            href="/orders"
            className={cn(
              "hidden sm:inline-flex items-center text-sm font-medium",
              "text-[var(--color-foreground)] hover:text-[var(--color-accent)]",
              "transition-colors"
            )}
          >
            Account
          </Link>

          {/* Cart drawer trigger */}
          <button
            type="button"
            onClick={openDrawer}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium",
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
                  "bg-[var(--color-accent)] text-[var(--color-primary-foreground)] text-xs font-bold tabular-nums"
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

      {/* Soft announcement bar — editorial tone */}
      <div
        className={cn(
          "bg-[var(--color-cream)]",
          "border-t border-[var(--color-warm-border)]"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 py-1.5 text-center text-xs text-[var(--color-warm-muted)]">
          Free shipping on orders over $50&nbsp; ·&nbsp; from vendors you can trust
        </div>
      </div>
    </header>
  );
}