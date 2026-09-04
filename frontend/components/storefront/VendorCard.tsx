/**
 * VendorCard — single vendor tile used by /vendors directory (§3).
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
        "glass-panel transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_hsl(var(--color-foreground)/0.12)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2"
      )}
      aria-label={`Visit ${vendor.name} storefront`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-[var(--color-muted)] to-[var(--color-secondary)]",
            "text-[var(--color-primary)]"
          )}
          aria-hidden
        >
          <Store className="h-6 w-6" />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
            "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]",
            "text-xs font-medium"
          )}
        >
          <Package className="h-3 w-3" aria-hidden />
          {vendor.activeProductCount}
        </span>
      </div>

      <h3 className="text-base font-semibold text-[var(--color-foreground)] leading-tight group-hover:text-[var(--color-primary)] transition-colors">
        {vendor.name}
      </h3>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
        {vendor.activeProductCount} active product{vendor.activeProductCount !== 1 ? "s" : ""}
        {vendor.activeProductCount !== vendor.productCount && (
          <> &middot; {vendor.productCount} total</>
        )}
      </p>
    </Link>
  );
}
