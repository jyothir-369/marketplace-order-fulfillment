/**
 * CatalogGrid — responsive product grid (§3.1.1).
 *
 * Renders a 1→2→3→4 column responsive grid of ProductCard items,
 * the CatalogGridSkeleton while loading, or the EmptyState when no
 * products match.
 */

"use client";

import { CatalogGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/api";

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
    return <CatalogGridSkeleton count={8} />;
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

  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
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
    </div>
  );
}
