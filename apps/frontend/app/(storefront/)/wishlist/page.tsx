"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useWishlistStore, selectWishlistItems, selectWishlistHydrated } from "@/lib/hooks/use-wishlist";
import { useCartStore } from "@/context/CartStore";
import { getProductById } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export default function WishlistPage() {
  const items = useWishlistStore(selectWishlistItems);
  const hydrated = useWishlistStore(selectWishlistHydrated);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const clearWishlist = useWishlistStore((s) => s.clearWishlist);
  const addToCart = useCartStore((s) => s.addToCart);
  const [products, setProducts] = useState<Record<string, { name: string; price: number; vendorName: string; stockCount: number; isActive: boolean }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) { setProducts({}); return; }
    setLoading(true);
    Promise.all(items.map(async (id) => {
      try {
        const p = await getProductById(id);
        return { id, p };
      } catch {
        return { id, p: null };
      }
    })).then((results) => {
      const map: typeof products = {};
      results.forEach(({ id, p }) => {
        if (p) map[id] = { name: p.name, price: p.price, vendorName: p.vendorName, stockCount: p.stockCount, isActive: p.isActive };
      });
      setProducts(map);
      setLoading(false);
    });
  }, [items, hydrated]);

  if (!hydrated) return <div className="max-w-4xl mx-auto px-6 py-12"><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/products" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)] mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Catalog
      </Link>
      <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)] mb-2">Saved Items</h1>
      <p className="text-sm text-[var(--color-warm-muted)] mb-8">{items.length} item{items.length !== 1 ? "s" : ""} saved for later.</p>

      {items.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="h-10 w-10 text-[var(--color-brass)]" />} title="Your wishlist is empty" description="Browse the catalog and save items you love." action={<Link href="/products" className="px-5 py-2.5 rounded-md bg-[var(--color-primary)] text-white">Browse Catalog</Link>} />
      ) : loading ? (
        <div className="space-y-4">{items.map((id) => <Skeleton key={id} className="h-24 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {items.map((id) => {
            const p = products[id];
            if (!p) return null;
            return (
              <div key={id} className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-v2">
                <div className="h-16 w-16 rounded-xl bg-[var(--color-cream)] flex items-center justify-center text-xl font-display font-bold text-[var(--color-ink-navy)]">{p.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${id}`} className="font-display text-base font-bold text-[var(--color-foreground)] hover:text-[var(--color-brass)] truncate block">{p.name}</Link>
                  <p className="text-xs text-[var(--color-warm-muted)]">by {p.vendorName} · {p.isActive ? (p.stockCount > 0 ? `${p.stockCount} in stock` : "Out of stock") : "Inactive"}</p>
                  <p className="font-display text-lg font-bold text-[var(--color-foreground)]">${p.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { addToCart({ productId: id, name: p.name, price: p.price, quantity: 1, maxStock: p.stockCount, vendorId: "", vendorName: p.vendorName }); }} disabled={!p.isActive || p.stockCount === 0} className={cn("px-3 py-2 rounded-lg text-xs font-semibold border transition", !p.isActive || p.stockCount === 0 ? "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-transparent cursor-not-allowed" : "bg-[var(--color-primary)] text-white hover:opacity-90 border-transparent")}>
                    Move to Cart
                  </button>
                  <button onClick={() => toggleWishlist(id)} aria-label="Remove from wishlist" className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
          {items.length > 0 && (
            <button onClick={clearWishlist} className="mt-4 text-xs font-semibold text-[var(--color-destructive)] hover:underline">Clear all saved items</button>
          )}
        </div>
      )}
    </div>
  );
}
