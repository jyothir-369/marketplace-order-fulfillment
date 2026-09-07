/**
 * StorefrontFooter — V2 Premium editorial footer for the buyer storefront.
 *
 * Layout: 3 link columns + brand column on warm-cream surface.
 * Tone: editorial copy, brass accent on the brand rule.
 *
 * Scope: storefront shell only — does not touch operational sidebars
 * (which are reserved for Phase 5).
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

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
    ],
  },
  {
    heading: "Your account",
    links: [
      { href: "/orders", label: "Orders" },
      { href: "/checkout", label: "Checkout" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/help", label: "Help center" },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link
              href="/products"
              className="inline-flex items-baseline gap-1.5 text-[var(--color-foreground)]"
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
                  <li key={l.href}>
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
      </div>
    </footer>
  );
}