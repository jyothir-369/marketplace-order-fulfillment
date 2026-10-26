/**
 * ProductCard — premium compact ecommerce card.
 * Redesign: compact image (120-150px), clean info, navy CTA.
 */
"use client";
import Link from "next/link";
import { ShoppingCart, Check, Package, Eye } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useState } from "react";
import { useWishlistStore } from "@/lib/hooks/use-wishlist";
import { QuickViewModal } from "@/components/storefront/QuickViewModal";
import type { Product } from "@/lib/api";

interface ProductCardProps {
  product: Product;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onAdd: () => void;
  justAdded?: boolean;
}

function WishlistHeartIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function QuickViewEyeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export function ProductCard({ product, quantity, onQuantityChange, onAdd, justAdded = false }: ProductCardProps) {
  const isOut = product.stockCount === 0;
  const isScarcity = product.stockCount > 0 && product.stockCount <= 5;
  const isWishlisted = useWishlistStore((s) => s.items.includes(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const imageUrl = product.images && Array.isArray(product.images) && product.images[0] ? product.images[0] : (product as any).image || undefined;

  return (
    <>
      <article
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-xl bg-[#F8F5EF]",
          "border border-[#D8D2C8] shadow-sm transition-all duration-200 ease-out",
          "hover:shadow-md hover:-translate-y-1 hover:border-[#C69A4B]/40",
          justAdded && "ring-2 ring-[#C69A4B]/60"
        )}
        aria-label={`${product.name} by ${product.vendorName}`}
      >
        {/* Image container */}
        <div className="relative w-full h-[140px] sm:h-[150px] bg-white flex items-center justify-center overflow-hidden">
          {/* Stock badge top-left */}
          <div className="absolute top-2 left-2 z-10">
            {isOut ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F5EF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#777777] border border-[#D8D2C8] shadow-sm">
                Out of Stock
              </span>
            ) : isScarcity ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#16233F] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                Only {product.stockCount} left
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F5EF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#777777] border border-[#D8D2C8] shadow-sm">
                In Stock
              </span>
            )}
          </div>
          {/* Wishlist / Quick View icons top-right */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setQuickViewOpen(true); }}
              aria-label={`Quick view of ${product.name}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 border border-[#D8D2C8] text-[#252525] shadow-sm hover:text-[#C69A4B] hover:border-[#C69A4B]/40 transition-colors"
            >
              <QuickViewEyeIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleWishlist(product.id); }}
              aria-label={isWishlisted ? `Remove ${product.name}` : `Save ${product.name}`}
              aria-pressed={isWishlisted}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 border border-[#D8D2C8] shadow-sm transition-colors",
                isWishlisted ? "text-[#C69A4B] fill-[#C69A4B] border-[#C69A4B]/40" : "text-[#777777] hover:text-[#C69A4B] hover:border-[#C69A4B]/40"
              )}
            >
              <WishlistHeartIcon filled={isWishlisted} className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Product image */}
          <Link href={`/products/${product.id}`} className="flex items-center justify-center w-full h-full p-4 focus:outline-none" aria-label={product.name}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="max-h-[110px] max-w-[85%] object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = 'none';
                  const container = img.parentElement;
                  if (container && !container.querySelector('.img-fallback')) {
                    const fb = document.createElement('div');
                    fb.className = 'img-fallback flex flex-col items-center justify-center text-[#777777]';
                    fb.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg><span class="text-[10px] font-medium">Image unavailable</span>';
                    container.insertBefore(fb, img.nextSibling);
                    img.remove();
                  }
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[#777777]">
                <Package className="h-8 w-8 mb-1 opacity-40" />
                <span className="text-[10px] font-medium">No image</span>
              </div>
            )}
          </Link>
        </div>

        {/* Info container */}
        <div className="flex flex-col gap-2 px-4 pt-3 pb-4 flex-1">
          {/* Category */}
          {product.category && (
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C69A4B] leading-none">
              {product.category}
            </p>
          )}
          {/* Product name */}
          <Link href={`/products/${product.id}`} className="font-display text-base font-bold leading-snug text-[#252525] hover:text-[#C69A4B] transition-colors line-clamp-2">
            {product.name}
          </Link>
          {/* Vendor */}
          <p className="text-[11px] text-[#777777] leading-none">by {product.vendorName}</p>
          {/* Price + stock */}
          <div className="flex items-baseline justify-between gap-3 pt-1">
            <span className="text-base font-extrabold text-[#16233F] leading-none tracking-tight">{formatCurrency(product.price)}</span>
            <span className={cn("text-[11px] font-medium leading-none", isOut ? "text-[#777777]" : "text-[#777777]")}>{product.stockCount} in stock</span>
          </div>
          {/* Quantity */}
          {!isOut && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-semibold text-[#777777] uppercase tracking-wider">Qty</span>
              <div className="inline-flex items-center rounded-md border border-[#D8D2C8] bg-white shadow-xs overflow-hidden">
                <button type="button" onClick={() => onQuantityChange(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="px-2 py-0.5 text-[#777777] hover:text-[#252525] hover:bg-[#F8F5EF] disabled:opacity-30 transition-colors text-sm font-medium" aria-label="Decrease quantity">−</button>
                <span className="px-2 py-0.5 font-bold text-[#252525] text-sm tabular-nums min-w-[1.5rem] text-center">{quantity}</span>
                <button type="button" onClick={() => onQuantityChange(Math.min(product.stockCount, quantity + 1))} disabled={quantity >= product.stockCount} className="px-2 py-0.5 text-[#777777] hover:text-[#252525] hover:bg-[#F8F5EF] disabled:opacity-30 transition-colors text-sm font-medium" aria-label="Increase quantity">+</button>
              </div>
            </div>
          )}
          {/* CTA */}
          <button
            type="button"
            disabled={isOut}
            onClick={onAdd}
            className={cn(
              "mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69A4B] focus:ring-offset-1",
              isOut ? "bg-[#D8D2C8]/60 text-[#777777] cursor-not-allowed" : justAdded ? "bg-[#C69A4B] text-white shadow-sm" : "bg-[#16233F] text-white hover:bg-[#0f1a2a] hover:shadow-md"
            )}
          >
            {justAdded ? (
              <>
                <Check className="h-4 w-4" aria-hidden /> Added to cart
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" aria-hidden /> Add to cart
              </>
            )}
          </button>
        </div>
      </article>

      <QuickViewModal
        product={product}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        onAdd={(_id, qty) => { onQuantityChange(qty); onAdd(); }}
      />
    </>
  );
}
