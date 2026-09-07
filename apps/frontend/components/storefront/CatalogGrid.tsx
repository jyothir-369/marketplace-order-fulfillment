/**
 * CatalogGrid — responsive product grid (§3.1.1).
 *
 * V2 Premium upgrade: mirrors the luxury editorial Vendors grid.
 *   - 3-column base grid (md:2 → lg:3) matching VendorCard density
 *   - VendorCard-style card elevation: rounded-2xl, shadow-v2,
 *     warm-border, brass hover accent, sticky CTA footer
 *   - Animated card lift on hover: translateY(-1.5px) + shadow-v2-lg
 *   - "Artisan Collection" partner invitation card anchors the grid
 */

"use client";

import Link from "next/link";
import { Package, ArrowUpRight } from "lucide-react";
import { CatalogGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CatalogGridProps {
  products: Product[];
  loading: boolean;
  quantities: Record<string, number>;
  onQuantityChange: (productId: string, qty: number) => void;
  onAdd: (product: Product) => void;
  /** Set of productIds that just got added (shows checkmark for ~2s). */
  addedIds: Set<string>;
}

export function CatalogGrid({
  products,
  loading,
  quantities,
  onQuantityChange,
  onAdd,
  addedIds,
}: CatalogGridProps) {
  if (loading) {
    return <CatalogGridSkeleton count={6} />;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={56}
            height={56}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        }
        title="No products found"
        description="Try adjusting your search or filter criteria, or seed the catalog to get started."
      />
    );
  }

  // Anchor: fill the grid so (count % 3) never leaves a trailing solo card.
  const fillSlots = (3 - (products.length % 3)) % 3;

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      aria-label="Product catalog"
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          quantity={quantities[product.id] ?? 1}
          onQuantityChange={(qty) => onQuantityChange(product.id, qty)}
          onAdd={() => onAdd(product)}
          justAdded={addedIds.has(product.id)}
        />
      ))}

      {/* Artisan Collection invitation card — balances the grid */}
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
            <Package className="h-6 w-6" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brass)]">
            Artisan Collection
          </p>
          <h3 className="font-display text-xl font-bold text-[var(--color-foreground)] leading-snug">
            Discover curated goods from verified sellers
          </h3>
          <p className="text-xs text-[var(--color-warm-muted)] leading-relaxed">
            Browse thousands of products across verified vendors — all backed by our
            automated multi-carrier fulfillment system and buyer protection guarantee.
          </p>
        </div>

        <div className="pt-6">
          <Link
            href="/vendors"
            className={cn(
              "inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold",
              "bg-[var(--color-ink-navy)] text-white hover:bg-[var(--color-primary-hover)]",
              "border border-[var(--color-brass)]/40 shadow-xs transition-all duration-200"
            )}
          >
            <span>Browse All Vendors</span>
            <ArrowUpRight className="h-4 w-4 text-[var(--color-brass)]" />
          </Link>
        </div>
      </div>
    </div>
  );
}