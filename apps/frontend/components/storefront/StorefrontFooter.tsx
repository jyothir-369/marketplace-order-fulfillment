/**
 * StorefrontFooter — V2 Premium editorial footer for the buyer storefront.
 *
 * Layout: 5 link columns + brand column on warm-cream surface.
 * Columns: Shop, Your account, Sell, Company, Support.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Lock, ShieldCheck, Truck, Receipt } from "lucide-react";

const FOOTER_NAV: ReadonlyArray<{
  heading: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}> = [
  {
    heading: "Shop",
    links: [
      { href: "/products", label: "All products" },
      { href: "/products?deals=1", label: "Deals" },
      { href: "/vendors", label: "Vendors" },
      { href: "/wishlist", label: "Wishlist" },
    ],
  },
  {
    heading: "Your account",
    links: [
      { href: "/orders", label: "Orders" },
      { href: "/checkout", label: "Checkout" },
      { href: "/wishlist", label: "Wishlist" },
    ],
  },
  {
    heading: "Sell",
    links: [
      { href: "/vendor/dashboard", label: "Vendor Portal" },
      { href: "/vendor/products", label: "Manage products" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/help", label: "Help center" },
    ],
  },
  {
    heading: "Support",
    links: [
      { href: "/help", label: "Help center" },
      { href: "/notifications", label: "Notifications" },
      { href: "/help", label: "Contact support" },
      { href: "/help", label: "Returns" },
    ],
  },
];

export function StorefrontFooter() {
  return (
    <footer
      className={cn(
        "mt-24",
        "bg-[var(--color-cream)]",
        "border-t border-[var(--color-warm-border)]"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link
              href="/products"
              className="inline-flex items-baseline gap-1.5 text-[var(--color-foreground)]"
            >
              <span className="font-display text-xl font-bold tracking-tight">
                Marketplace
              </span>
            </Link>
            <span
              aria-hidden
              className="mt-3 block h-px w-10 bg-[var(--color-accent)]"
            />
            <p className="mt-4 text-sm text-[var(--color-warm-muted)] leading-relaxed max-w-xs">
              A premium commerce experience built on correctness — buyers,
              vendors and operators, one dependable system.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_NAV.map((col) => (
            <nav
              key={col.heading}
              aria-label={col.heading}
              className="space-y-3"
            >
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-[var(--color-foreground)]">
                {col.heading}
              </h3>
              <span
                aria-hidden
                className="block h-px w-6 bg-[var(--color-accent)]"
              />
              <ul className="space-y-2 pt-1">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div
          className={cn(
            "mt-10 pt-6 border-t border-[var(--color-warm-border)]",
            "flex flex-col sm:flex-row items-center justify-between gap-3",
            "text-xs text-[var(--color-warm-subtle)]"
          )}
        >
          <p>&copy; 2026 Marketplace. All rights reserved.</p>
          <p className="font-display italic">Shop from vendors you can trust.</p>
        </div>
        {/* Trust indicators */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--color-warm-subtle)]">
          <span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3 text-[var(--color-forest)]" aria-hidden /> Secure checkout</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-[var(--color-forest)]" aria-hidden /> Verified vendors</span>
          <span className="inline-flex items-center gap-1.5"><Truck className="h-3 w-3 text-[var(--color-forest)]" aria-hidden /> Delivery tracking</span>
          <span className="inline-flex items-center gap-1.5"><Receipt className="h-3 w-3 text-[var(--color-forest)]" aria-hidden /> Return policy</span>
        </div>
      </div>
    </footer>
  );
}
