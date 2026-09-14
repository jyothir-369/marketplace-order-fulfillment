/**
 * StorefrontHeader â€” V2 Premium sticky top bar for the buyer storefront.
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
import { AccountMenu } from "@/components/auth/AccountMenu";
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
        "relative w-full",
        "backdrop-blur-md bg-[var(--color-ivory)]/90",
        "border-b border-[var(--color-warm-border)]",
        "shadow-v2 transition-all duration-200"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: brand wordmark + nav */}
        <div className="flex items-center gap-8 shrink-0">
          <Link
            href="/products"
            className={cn(
              "group inline-flex items-baseline",
              "text-[var(--color-foreground)]",
              "transition-opacity hover:opacity-80"
            )}
          >
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
                    "group relative inline-flex items-center gap-1.5 py-1 text-sm font-medium",
                    "transition-colors duration-200",
                    isActive
                      ? "text-[var(--color-ink-navy)] font-semibold"
                      : "text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)]"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 transition-colors duration-200",
                      isActive
                        ? "text-[var(--color-brass)]"
                        : "text-[var(--color-warm-subtle)] group-hover:text-[var(--color-warm-muted)]"
                    )}
                    aria-hidden
                  />
                  <span>{label}</span>
                  {/* Polished active indicator: smooth expanding brass underline rule */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -bottom-\[16px\] left-0 right-0 h-\[2px\] rounded-full bg-\[var(--color-brass)\]",
                      "transition-all duration-300 ease-out",
                      isActive
                        ? "opacity-100 scale-x-100 shadow-[0_1px_4px_rgba(169,128,63,0.3)]"
                        : "opacity-0 scale-x-0 group-hover:opacity-40 group-hover:scale-x-75"
                    )}
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Center: global search with polished brass focus ring */}
        <form
          role="search"
          onSubmit={handleSearch}
          className={cn(
            "group relative flex-1 max-w-md hidden md:flex items-center",
            "rounded-lg border border-[var(--color-warm-border)]",
            "bg-[var(--color-ivory-card)]/70 backdrop-blur-xs overflow-hidden",
            "transition-all duration-200",
            "hover:border-[var(--color-warm-border-strong)]",
            "focus-within:border-[var(--color-brass)] focus-within:ring-2 focus-within:ring-[var(--color-brass)]/30 focus-within:bg-[var(--color-card)] focus-within:shadow-xs"
          )}
        >
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-warm-muted)] pointer-events-none transition-colors duration-200 group-focus-within:text-[var(--color-brass)]"
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
              "text-[var(--color-foreground)] placeholder:text-[var(--color-warm-muted)]",
              "focus:outline-none"
            )}
          />
        </form>

        {/* Right: cart trigger */}
        <div className="flex items-center gap-2">
          {/* Mobile nav â€” icon-only links */}
          <nav aria-label="Mobile navigation" className="flex sm:hidden items-center gap-1">
            {NAV_LINKS.map(({ href, label, Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium",
                    "transition-all duration-200",
                    isActive
                      ? "bg-[var(--color-ink-navy)] text-[var(--color-primary-foreground)] shadow-xs ring-1 ring-[var(--color-brass)]/40"
                      : "text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-cream)]/50"
                  )}
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={cn("h-4 w-4", isActive && "text-[var(--color-brass)]")}
                    aria-hidden
                  />
                </Link>
              );
            })}
          </nav>

          {/* Account menu (Phase 1: sign-in state + role-aware portal links) */}
          <AccountMenu />

          {/* Cart drawer trigger */}
          <button
            type="button"
            onClick={openDrawer}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium",
              "bg-[var(--color-ink-navy)] text-[var(--color-primary-foreground)]",
              "hover:bg-[var(--color-primary-hover)] transition-all duration-200 shadow-xs hover:shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-brass)]"
            )}
            aria-label={
              hydrated
                ? `Open cart (${totalItems} item${totalItems !== 1 ? "s" : ""})`
                : "Open cart"
            }
          >
            <ShoppingCart className="h-4 w-4 text-[var(--color-brass)]" aria-hidden />
            <span className="hidden sm:inline">Cart</span>
            {hydrated && totalItems > 0 && (
              <span
                className={cn(
                  "ml-1 inline-flex items-center justify-center",
                  "min-w-[1.25rem] h-5 px-1.5 rounded-full",
                  "bg-[var(--color-brass)] text-[var(--color-ink-navy)] text-xs font-bold tabular-nums"
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

      {/* Soft announcement bar â€” editorial tone */}
      <div
        className={cn(
          "bg-[var(--color-cream)]/85 backdrop-blur-md",
          "border-t border-[var(--color-warm-border)]/80"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 py-1.5 text-center text-xs text-[var(--color-warm-muted)]">
          Free shipping on orders over $50&nbsp; Â·&nbsp; from vendors you can trust
        </div>
      </div>
    </header>
  );
}