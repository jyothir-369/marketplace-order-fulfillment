/**
 * TabsBar — premium editorial tab strip. Single reusable component that powers
 * BOTH:
 *   (a) the global storefront tab strip under the sticky header (rendered once
 *       in the `(storefront)` layout), and
 *   (b) the per-category tab strip on the Shop page (rendered inline).
 *
 * Why one component instead of two look-alike bars:
 *   - One source of truth for the V2 luxury tab treatment: brass active rule,
 *     ivory surface, warm hairline separation, lucide icons, live count pills.
 *   - The `<CatalogGrid>`/filter state stays URL-driven (`?category=…`), so the
 *     tabs are plain `<Link>`s — no reroute of router.push through prop drilling.
 *
 * Props:
 *   - `tabs`            — ordered tab descriptors (`{ href, label, count?, Icon? }`).
 *   - `activeHref`      — the currently-selected href (matched with `startsWith`
 *                         so sub-paths like `/products/abc` keep Shop active).
 *   - `variant`         — `"bar"` (global, id shelves) vs `"pills"` (inline on
 *                         the Shop page; keeps the editorial hairlines).
 *   - `className`       — extra layout classes (e.g. `overflow-x-auto`).
 *
 * Accessibility:
 *   - Uses real `<Link>` elements; the strip exposes a single `aria-label`
 *     group and each tab has `aria-current="page"` when active (native link
 *     semantics — no synthetic `role="tab"` that would force arrow-key tab
 *     management we don't need for navigation links).
 */

"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabBarTab {
  href: string;
  label: string;
  /** Optional live count, mirrored for the metrics ribbon. */
  count?: number;
  /** Optional lucide icon shown to the left of the label. */
  Icon?: LucideIcon;
}

interface TabsBarProps {
  tabs: TabBarTab[];
  activeHref: string;
  variant?: "bar" | "pills";
  className?: string;
  ariaLabel?: string;
}

export function TabsBar({
  tabs,
  activeHref,
  variant = "bar",
  className,
  ariaLabel = "Browse departments",
}: TabsBarProps) {
  const isActive = (href: string) =>
    href === "/" ? activeHref === "/" : activeHref.startsWith(href);

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-1 overflow-x-auto scrollbar-none",
        variant === "bar" ? "border-b border-[var(--color-warm-border)]" : "",
        className
      )}
    >
      {tabs.map(({ href, label, count, Icon }) => {
        const active = isActive(href);
        const TabIcon = Icon;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative inline-flex shrink-0 items-center gap-1.5",
              "px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap",
              "transition-colors duration-200",
              active
                ? "text-[var(--color-foreground)]"
                : "text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)]"
            )}
          >
            {TabIcon && (
              <TabIcon
                className={cn(
                  "h-4 w-4 transition-colors duration-200",
                  active
                    ? "text-[var(--color-brass)]"
                    : "text-[var(--color-warm-muted)] group-hover:text-[var(--color-brass)]"
                )}
                aria-hidden
              />
            )}
            <span>{label}</span>
            {count !== undefined && (
              <span
                className={cn(
                  "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5",
                  "text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-[var(--color-brass)] text-[var(--color-ivory)]"
                    : "bg-[var(--color-cream)] text-[var(--color-warm-muted)]",
                  "transition-colors duration-200",
                  "group-hover:bg-[var(--color-ivory-hover)]"
                )}
              >
                {count}
              </span>
            )}
            {/* Active gold rule — the V2 premium underline treatment */}
            <span
              aria-hidden
              className={cn(
                "absolute -bottom-px left-0 right-0 h-[2px] rounded-full bg-[var(--color-brass)]",
                "transition-all duration-300 ease-out",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
