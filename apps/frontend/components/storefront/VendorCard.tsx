/**
 * VendorCard — luxury editorial storefront card for the vendor directory (§3).
 *
 * Upgraded from flat/monochrome box to a rich brand card:
 *   - Vibrant signature category gradient banner
 *   - Elevated brand monogram emblem with gold rim
 *   - Verified partner badge with gold star rating
 *   - Evocative editorial description & specialty pills
 *   - Interactive "Explore Storefront" slide CTA
 */

"use client";

import Link from "next/link";
import {
  Store,
  Package,
  Star,
  ShieldCheck,
  ArrowRight,
  Truck,
  Wrench,
  Cpu,
  Shirt,
  Utensils,
  Activity,
} from "lucide-react";
import type { VendorResponseDto } from "@/lib/types";
import { getVendorMeta, type VendorMeta } from "@/lib/vendor-meta";
import { cn } from "@/lib/utils";

interface VendorCardProps {
  vendor: VendorResponseDto;
}

function CategoryIcon({ type, className }: { type: VendorMeta["iconType"]; className?: string }) {
  switch (type) {
    case "tools":
      return <Wrench className={className} />;
    case "electronics":
      return <Cpu className={className} />;
    case "fashion":
      return <Shirt className={className} />;
    case "home":
      return <Utensils className={className} />;
    case "sports":
      return <Activity className={className} />;
    default:
      return <Store className={className} />;
  }
}

export function VendorCard({ vendor }: VendorCardProps) {
  const meta = getVendorMeta(vendor.name);
  const initial = vendor.name.charAt(0).toUpperCase();

  return (
    <Link
      href={`/vendors/${vendor.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl",
        "bg-[var(--color-card)] border border-[var(--color-warm-border)]",
        "shadow-v2 transition-all duration-300 ease-out",
        "hover:-translate-y-1.5 hover:shadow-v2-lg hover:border-[var(--color-brass)]/60",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-2"
      )}
      aria-label={`Visit ${vendor.name} storefront`}
    >
      {/* 1. Rich Signature Header Banner */}
      <div
        className={cn(
          "relative h-24 w-full overflow-hidden bg-gradient-to-r",
          meta.gradient
        )}
      >
        {/* Subtle decorative mesh overlay */}
        <div className="absolute inset-0 bg-black/15 mix-blend-multiply" />
        <div className="absolute -right-6 -bottom-6 opacity-20 text-white pointer-events-none">
          <CategoryIcon type={meta.iconType} className="h-28 w-28 transform -rotate-12" />
        </div>

        {/* Top badges: Verified pill + Rating */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-black/40 text-white/95 backdrop-blur-md border border-white/15 shadow-xs">
            <ShieldCheck className="h-3 w-3 text-[var(--color-brass)]" />
            Verified Partner
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-black/50 text-amber-300 backdrop-blur-md border border-amber-400/30">
            <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
            {meta.rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* 2. Brand Emblem & Category */}
      <div className="px-5 pt-0 pb-5 flex flex-col flex-1">
        <div className="flex items-end justify-between -mt-8 mb-3">
          {/* Elevated Brand Monogram */}
          <div
            className={cn(
              "h-16 w-16 rounded-2xl flex items-center justify-center shrink-0",
              "bg-gradient-to-br shadow-md ring-4 ring-[var(--color-card)]",
              meta.emblemGradient
            )}
            aria-hidden
          >
            <span className="font-display text-2xl font-bold text-white leading-none">
              {initial}
            </span>
          </div>

          {/* Product count pill */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tabular-nums",
              "bg-[var(--color-cream)] border border-[var(--color-warm-border)] text-[var(--color-ink-navy)] shadow-xs"
            )}
          >
            <Package className="h-3.5 w-3.5 text-[var(--color-brass)]" aria-hidden />
            {vendor.activeProductCount} products
          </span>
        </div>

        {/* Category Eyebrow */}
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brass)]">
          {meta.category}
        </p>

        {/* Vendor Name */}
        <h3 className="font-display text-xl font-bold text-[var(--color-foreground)] mt-1 group-hover:text-[var(--color-brass)] transition-colors leading-snug">
          {vendor.name}
        </h3>

        {/* Curated Editorial Tagline */}
        <p className="mt-2 text-xs text-[var(--color-warm-muted)] line-clamp-2 leading-relaxed flex-1">
          {meta.tagline}
        </p>

        {/* Highlights Chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-[var(--color-cream)]/70 text-[var(--color-warm-muted)] border border-[var(--color-warm-border)]/80">
            <Truck className="h-2.5 w-2.5 text-[var(--color-forest)]" />
            Fast Dispatch
          </span>
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-[var(--color-cream)]/70 text-[var(--color-warm-muted)] border border-[var(--color-warm-border)]/80">
            {meta.established}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-[var(--color-cream)]/70 text-[var(--color-warm-muted)] border border-[var(--color-warm-border)]/80">
            {meta.reviewsCount}+ reviews
          </span>
        </div>

        {/* 3. Action Footer */}
        <div className="mt-4 pt-3.5 border-t border-[var(--color-warm-border)] flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-brass)] transition-colors">
            Explore Collection
          </span>
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-[var(--color-cream)] text-[var(--color-ink-navy)] group-hover:bg-[var(--color-ink-navy)] group-hover:text-[var(--color-brass)] transition-all duration-200">
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
