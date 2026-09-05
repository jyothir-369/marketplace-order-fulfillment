/**
 * app/(storefront)/vendors/page.tsx — Vendor directory (§3).
 *
 * V2 Premium treatment:
 *   - Editorial "Vendors on Marketplace" hero (eyebrow + serif H1)
 *   - Warm ivory background, hairline card borders
 *   - Status badges and core vendor data unchanged
 *   - Brass underline rule under hero (decorative)
 */

"use client";

import { useEffect, useState } from "react";
import { getVendors } from "@/lib/api";
import type { VendorResponseDto } from "@/lib/types";
import { VendorCard } from "@/components/storefront/VendorCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { editorialEyebrows } from "@/lib/theme";

function VendorsGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--color-card)] border border-[var(--color-warm-border)] rounded-2xl p-5 space-y-3 shadow-v2"
        >
          <Skeleton height="3rem" width="3rem" />
          <Skeleton height="1rem" width="70%" />
          <Skeleton height="0.75rem" width="40%" />
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
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Editorial hero */}
      <div className="mb-8">
        <p
          aria-hidden
          className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)] mb-1"
        >
          {editorialEyebrows.vendors}
        </p>
        <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)]">
          Our vendors
        </h1>
        <span
          aria-hidden
          className="mt-3 block h-px w-10 bg-[var(--color-accent)]"
        />
        <p className="text-sm text-[var(--color-warm-muted)] mt-3 max-w-2xl leading-relaxed">
          Discover the people and businesses behind every product in the marketplace.
        </p>
        <p className="text-xs text-[var(--color-warm-muted)] mt-2">
          {loading
            ? "Loading\u2026"
            : hasLoaded
              ? `${vendors.length} vendor${vendors.length !== 1 ? "s" : ""}`
              : ""}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] p-4 text-sm font-medium"
        >
          {error}
        </div>
      )}

      {loading ? (
        <VendorsGridSkeleton count={6} />
      ) : hasLoaded && vendors.length === 0 ? (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path d="M3 9l1-5h16l1 5" />
              <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
              <path d="M9 22V12h6v10" />
            </svg>
          }
          title="No vendors yet"
          description="Seed the catalog to populate the vendor directory."
        />
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          aria-label="Vendor directory"
        >
          {vendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  );
}
