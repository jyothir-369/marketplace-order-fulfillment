/**
 * app/(storefront)/vendors/page.tsx — Luxury Vendor Directory (§3).
 *
 * Transformed from a stark black-and-white layout into a vibrant,
 * luxury editorial directory:
 *   - Midnight navy & brass ambient hero banner with trust badges
 *   - Marketplace performance metrics ribbon
 *   - Live search & category filter chips
 *   - Balanced 3-column responsive showcase grid with partner callout
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  Star,
  CheckCircle2,
  Search,
  Store,
  Sparkles,
  ArrowUpRight,
  Package,
} from "lucide-react";
import { getVendors } from "@/lib/api";
import type { VendorResponseDto } from "@/lib/types";
import { VendorCard } from "@/components/storefront/VendorCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CATEGORY_FILTERS = [
  "All Sellers",
  "Tools & Hardware",
  "Electronics & Tech",
  "Apparel & Luxury",
  "Home & Living",
  "Athletics & Outdoor",
] as const;

function VendorsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--color-card)] border border-[var(--color-warm-border)] rounded-2xl overflow-hidden shadow-v2"
        >
          <Skeleton height="6rem" width="100%" />
          <div className="p-5 space-y-3">
            <Skeleton height="3.5rem" width="3.5rem" className="rounded-2xl -mt-9 ring-4 ring-[var(--color-card)]" />
            <Skeleton height="1.25rem" width="60%" />
            <Skeleton height="0.875rem" width="90%" />
            <Skeleton height="0.875rem" width="75%" />
            <Skeleton height="2rem" width="100%" className="mt-4 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VendorsDirectoryPage() {
  const [vendors, setVendors] = useState<VendorResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Sellers");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getVendors()
      .then((data) => {
        if (cancelled) return;
        setVendors(data);
        setHasLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load vendors");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter vendors based on category & search term
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        (q.includes("tool") && v.name.toLowerCase().includes("tool")) ||
        (q.includes("electr") && v.name.toLowerCase().includes("electr")) ||
        (q.includes("fashion") && v.name.toLowerCase().includes("fashion")) ||
        (q.includes("home") && v.name.toLowerCase().includes("home")) ||
        (q.includes("sport") && v.name.toLowerCase().includes("sport"));

      if (!matchesSearch) return false;

      if (selectedCategory === "All Sellers") return true;
      if (selectedCategory === "Tools & Hardware") return v.name.toLowerCase().includes("tool");
      if (selectedCategory === "Electronics & Tech") return v.name.toLowerCase().includes("electr");
      if (selectedCategory === "Apparel & Luxury") return v.name.toLowerCase().includes("fashion");
      if (selectedCategory === "Home & Living") return v.name.toLowerCase().includes("home");
      if (selectedCategory === "Athletics & Outdoor") return v.name.toLowerCase().includes("sport");

      return true;
    });
  }, [vendors, searchQuery, selectedCategory]);

  const totalProducts = vendors.reduce((acc, v) => acc + (v.activeProductCount ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* 1. Midnight Navy & Brass Editorial Hero Banner */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl",
          "bg-gradient-to-br from-[#0e1830] via-[#16233f] to-[#1d2d4f]",
          "border border-[var(--color-brass)]/35 text-white shadow-v2-lg",
          "p-8 sm:p-12"
        )}
      >
        {/* Subtle decorative glow & brand monogram watermark */}
        <div className="absolute -right-12 -bottom-16 select-none opacity-10 text-[var(--color-brass)] font-display text-[16rem] pointer-events-none leading-none">
          ✦
        </div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-brass)]/20 border border-[var(--color-brass)]/40 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-[11px] font-bold tracking-[0.2em] text-amber-200 uppercase">
              Curated Partner Directory
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            Independent Artisans &amp; Verified Merchants
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
            Discover the verified craftspeople, industrial toolmakers, and boutique ateliers powering our marketplace.
            Every merchant is vetted for exceptional build quality, authentic origin, and automated direct dispatch.
          </p>

          {/* Trust guarantees bar */}
          <div className="pt-2 flex flex-wrap gap-y-2 gap-x-6 text-xs text-slate-300">
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>100% Authenticity Vetted</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-400" />
              <span>Direct Warehouse Dispatch</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-sky-400" />
              <span>Buyer Escrow Protection</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span>4.9★ Average Satisfaction</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Directory Performance Stats Ribbon */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-warm-border)] shadow-v2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brass)]">
            Verified Partners
          </p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-foreground)] mt-1">
            {loading ? "…" : vendors.length}
          </p>
          <p className="text-xs text-[var(--color-warm-muted)] mt-1">
            Independently vetted merchants
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-warm-border)] shadow-v2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brass)]">
            Catalog Offerings
          </p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-foreground)] mt-1">
            {loading ? "…" : `${totalProducts}+`}
          </p>
          <p className="text-xs text-[var(--color-warm-muted)] mt-1">
            Curated artisan &amp; tech products
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-warm-border)] shadow-v2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brass)]">
            Merchant Satisfaction
          </p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-foreground)] mt-1 flex items-center gap-1.5">
            4.9 <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
          </p>
          <p className="text-xs text-[var(--color-warm-muted)] mt-1">
            Based on 1,000+ verified orders
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-warm-border)] shadow-v2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brass)]">
            Dispatch Velocity
          </p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-forest)] mt-1">
            &lt; 24 Hours
          </p>
          <p className="text-xs text-[var(--color-warm-muted)] mt-1">
            Automated fulfillment syncing
          </p>
        </div>
      </section>

      {/* 3. Search & Category Filters Bar */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search box with brass focus ring */}
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-warm-muted)] pointer-events-none"
              aria-hidden
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendors by name, craft, or category..."
              className={cn(
                "w-full rounded-xl pl-10 pr-4 py-2.5 text-sm",
                "bg-[var(--color-card)] border border-[var(--color-warm-border)]",
                "text-[var(--color-foreground)] placeholder:text-[var(--color-warm-muted)]",
                "focus:outline-none focus:border-[var(--color-brass)] focus:ring-2 focus:ring-[var(--color-brass)]/25",
                "transition-all shadow-xs"
              )}
            />
          </div>

          <div className="text-xs font-medium text-[var(--color-warm-muted)]">
            Showing <strong className="text-[var(--color-foreground)]">{filteredVendors.length}</strong> of {vendors.length} verified sellers
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_FILTERS.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200",
                  isActive
                    ? "bg-[var(--color-ink-navy)] text-white shadow-xs ring-1 ring-[var(--color-brass)]/50"
                    : "bg-[var(--color-cream)]/70 text-[var(--color-warm-muted)] border border-[var(--color-warm-border)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-cream)]"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Error state */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] p-5 text-sm font-medium"
        >
          {error}
        </div>
      )}

      {/* 5. Vendors Showcase Grid */}
      {loading ? (
        <VendorsGridSkeleton count={6} />
      ) : filteredVendors.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[var(--color-card)] border border-[var(--color-warm-border)]">
          <Store className="h-10 w-10 mx-auto text-[var(--color-brass)] mb-3" />
          <h3 className="font-display text-lg font-bold text-[var(--color-foreground)]">
            No merchants match your criteria
          </h3>
          <p className="text-xs text-[var(--color-warm-muted)] mt-1">
            Try adjusting your search query or reset the category filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All Sellers");
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--color-ink-navy)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          aria-label="Vendor directory"
        >
          {filteredVendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}

          {/* 6. Partner Program Invitation Card to balance the grid beautifully */}
          <div
            className={cn(
              "relative flex flex-col justify-between overflow-hidden rounded-2xl p-6",
              "border-2 border-dashed border-[var(--color-brass)]/40",
              "bg-gradient-to-br from-[var(--color-cream)]/50 via-[var(--color-card)] to-[var(--color-cream)]/30",
              "transition-all duration-300 hover:border-[var(--color-brass)] hover:shadow-v2"
            )}
          >
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[var(--color-brass)]/15 flex items-center justify-center text-[var(--color-brass)]">
                <Store className="h-6 w-6" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brass)]">
                Artisan Partnership
              </p>
              <h3 className="font-display text-xl font-bold text-[var(--color-foreground)] leading-snug">
                Join our curated merchant network
              </h3>
              <p className="text-xs text-[var(--color-warm-muted)] leading-relaxed">
                Are you an independent craftsman, certified hardware manufacturer, or specialty studio?
                Integrate with our automated multi-vendor order fulfillment system.
              </p>
            </div>

            <div className="pt-6">
              <Link
                href="/admin/vendors"
                className={cn(
                  "inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold",
                  "bg-[var(--color-ink-navy)] text-white hover:bg-[var(--color-primary-hover)]",
                  "border border-[var(--color-brass)]/40 shadow-xs transition-all duration-200"
                )}
              >
                <span>Apply for Storefront</span>
                <ArrowUpRight className="h-4 w-4 text-[var(--color-brass)]" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
