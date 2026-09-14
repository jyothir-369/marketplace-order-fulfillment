/**
 * lib/storefront-nav.ts — single source of truth for storefront navigation.
 *
 * The storefront header, the global editorial tab bar, and the footer all
 * read from this one registry so a nav destination only ever has to be
 * declared once. Every entry corresponds to a real route under
 * `app/(storefront)/` — no 404s.
 *
 * Convention:
 *   - `href` must resolve to an existing page.
 *   - `label` is the human nav label.
 *   - `Icon` is a lucide-react icon used in the header + tab bar.
 *   - `showInBar` gates whether the destination also appears in the global
 *     editorial tab strip (some links are footer-only).
 */

import {
  Package,
  Store,
  ShoppingBag,
  BadgePercent,
  Heart,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";

export interface StorefrontNavEntry {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Whether this entry appears in the global tab bar strip. */
  showInBar?: boolean;
}

export const STOREFRONT_NAV: readonly StorefrontNavEntry[] = [
  { href: "/products", label: "Shop",     Icon: Package,     showInBar: true  },
  { href: "/deals",    label: "Deals",    Icon: BadgePercent, showInBar: true },
  { href: "/vendors",  label: "Vendors",  Icon: Store,       showInBar: true  },
  { href: "/orders",   label: "Orders",   Icon: ShoppingBag, showInBar: true  },
  { href: "/wishlist", label: "Wishlist", Icon: Heart,       showInBar: true  },
  { href: "/help",     label: "Help",     Icon: CircleHelp,  showInBar: false },
];

/** The subset surfaced as top-level tabs (header + tab bar). */
export const STOREFRONT_TABS = STOREFRONT_NAV.filter((n) => n.showInBar);
