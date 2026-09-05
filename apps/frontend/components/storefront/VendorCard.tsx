/**
 * VendorCard — single vendor tile used by /vendors directory (§3).
 *
 * V2 Premium treatment:
 *   - Warm hairline card border (#e7e0d2)
 *   - Brass-tinted gradient icon block
 *   - Serif vendor name (Playfair Display)
 *   - Soft V2 shadow on lift
 *   - Active count chip in brass
 */

"use client";

import Link from "next/link";
import { Store, Package } from "lucide-react";
import type { VendorResponseDto } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VendorCardProps {
  vendor: VendorResponseDto;
}

export function VendorCard({ vendor }: VendorCardProps) {
  return (
    <Link
      href={`/vendors/${vendor.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl p-5",
        "bg-[var(--color-card)]",
        "border border-[var(--color-warm-border)]",
        "shadow-v2 transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-v2-md hover:border-[var(--color-warm-border-strong)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2"
      )}
      aria-label={`Visit ${vendor.name} storefront`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
            "bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-ivory-muted)]",
            "text-[var(--color-accent)]"
          )}
          aria-hidden
        >
          <Store className="h-6 w-6" />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
            "bg-[var(--color-accent)]/15 text-[var(--color-accent)]",
            "text-xs font-semibold tabular-nums"
          )}
        >
          <Package className="h-3 w-3" aria-hidden />
          {vendor.activeProductCount}
        </span>
      </div>

      <h3 className="font-display text-lg font-semibold text-[var(--color-foreground)] leading-tight group-hover:text-[var(--color-accent)] transition-colors">
        {vendor.name}
      </h3>
      <p className="mt-1 text-xs text-[var(--color-warm-muted)]">
        {vendor.activeProductCount} active product{vendor.activeProductCount !== 1 ? "s" : ""}
        {vendor.activeProductCount !== vendor.productCount && (
          <> &middot; {vendor.productCount} total</>
        )}
      </p>
    </Link>
  );
}
