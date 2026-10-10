"use client";
import { cn } from "@/lib/utils";
import type { CategorySummaryDto, CatalogFacets } from "@/lib/types";
import { SearchBar, type SearchSuggestion } from "./search-bar";

interface FacetSidebarProps {
  facets?: CatalogFacets;
  selectedCategory?: string;
  selectedVendor?: string;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  className?: string;
  onCategoryChange?: (category: string) => void;
  onVendorChange?: (vendorId: string) => void;
  onPriceChange?: (min?: number, max?: number) => void;
  onSearch?: (q: string) => void;
  searchSuggestions?: SearchSuggestion[];
}

export function FacetSidebar({
  facets,
  selectedCategory,
  selectedVendor,
  minPrice,
  maxPrice,
  q,
  onCategoryChange,
  onVendorChange,
  onPriceChange,
  onSearch,
  searchSuggestions,
  className,
}: FacetSidebarProps) {
  const categories = facets?.categories ?? [];

  return (
    <aside className={cn("space-y-6", className)}>
      <SearchBar value={q} onChange={onSearch} suggestions={searchSuggestions} className="hidden md:block" />

      {/* Category chips */}
      <section aria-label="Categories">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-warm-muted)] mb-3">Category</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCategoryChange?.("")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
              !selectedCategory
                ? "bg-ink-navy text-white border-ink-navy"
                : "bg-white border-[var(--color-warm-border)] text-[var(--color-foreground)] hover:bg-[var(--color-cream)]"
            )}
          >
            All
            {facets && (
              <span className="ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums bg-[var(--color-cream)] text-[var(--color-warm-muted)]">
                {facets.totalProducts}
              </span>
            )}
          </button>
          {categories.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onCategoryChange?.(c.name)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
                selectedCategory === c.name
                  ? "bg-ink-navy text-white border-ink-navy"
                  : "bg-white border-[var(--color-warm-border)] text-[var(--color-foreground)] hover:bg-[var(--color-cream)]"
              )}
            >
              {c.name}
              <span className="ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums bg-[var(--color-cream)] text-[var(--color-warm-muted)]">
                {c.activeProductCount}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Price range */}
      <section aria-label="Price range">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-warm-muted)] mb-3">Price</h3>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} value={minPrice ?? ""} placeholder="Min"
            onChange={(e) => onPriceChange?.(e.target.value ? Number(e.target.value) : undefined, maxPrice)}
            className="w-20 h-9 px-3 rounded-lg border border-[var(--color-warm-border)] bg-[var(--color-card)] text-xs text-[var(--color-foreground)]"
            aria-label="Minimum price"
          />
          <span className="text-[var(--color-warm-muted)]">—</span>
          <input
            type="number" min={0} value={maxPrice ?? ""} placeholder="Max"
            onChange={(e) => onPriceChange?.(minPrice, e.target.value ? Number(e.target.value) : undefined)}
            className="w-20 h-9 px-3 rounded-lg border border-[var(--color-warm-border)] bg-[var(--color-card)] text-xs text-[var(--color-foreground)]"
            aria-label="Maximum price"
          />
        </div>
      </section>

      {/* Vendor filter */}
      {facets && facets.categories.length === 0 && (
        <p className="text-xs text-[var(--color-warm-subtle)]">No categories found. Try a different search term.</p>
      )}
    </aside>
  );
}
