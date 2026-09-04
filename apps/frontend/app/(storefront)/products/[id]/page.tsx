/**
 * app/(storefront)/products/[id]/page.tsx - Product Detail Page (§2.2, §4.2, GAP-F3).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { getProductById, type Product } from "@/lib/api";
import { useCartStore } from "@/context/CartStore";
import { InventoryLockIndicator } from "@/components/order/InventoryLockIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastProvider, useToast } from "@/components/ui/toast";

function PDPInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { push: toast } = useToast();
  const productId = params?.id ?? "";
  const addToCart = useCartStore((s) => s.addToCart);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      setProduct(await getProductById(productId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  const clampedQty = Math.max(1, Math.min(quantity, product?.stockCount ?? 1));

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: clampedQty,
      maxStock: product.stockCount,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
    });
    setAddedToCart(true);
    toast(`${product.name} added to cart.`, "success");
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: clampedQty,
      maxStock: product.stockCount,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
    });
    router.push("/checkout");
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Skeleton className="h-5 w-32 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-80 rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-1/4" />
            <div className="space-y-2 mt-6">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <EmptyState
          icon={<ArrowLeft size={40} aria-hidden />}
          title="Product not found"
          description={error ?? "This product does not exist or has been removed."}
          action={
            <Link
              href="/products"
              className="px-5 py-2.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
            >
              Back to Catalog
            </Link>
          }
        />
      </div>
    );
  }

  const isOutOfStock = product.stockCount === 0 || !product.isActive;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to Catalog
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-zinc-100 rounded-lg flex items-center justify-center h-80 border border-zinc-200">
          <div className="text-center text-zinc-400">
            <div className="text-5xl mb-2" aria-hidden>&#x1F4C4;</div>
            <span className="text-sm">Product image</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-zinc-500 mb-1">Sold by {product.vendorName}</p>
            <h1 className="text-3xl font-bold text-zinc-900">{product.name}</h1>
          </div>

          <div className="text-3xl font-bold text-zinc-900">
            
          </div>

          <InventoryLockIndicator stockCount={product.stockCount} />

          {!isOutOfStock && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-700 font-medium">Qty:</span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Decrease quantity" disabled={clampedQty <= 1} onClick={() => setQuantity((q) => q - 1)} className="h-9 w-9 flex items-center justify-center rounded border border-zinc-300 bg-white hover:bg-zinc-100 disabled:opacity-40 font-medium">-</button>
                <input type="number" min={1} max={product.stockCount} value={quantity} onChange={(e) => { const n = parseInt(e.target.value, 10); setQuantity(Number.isNaN(n) ? 1 : n); }} className="h-9 w-16 text-center border border-zinc-300 rounded text-sm" aria-label="Quantity" />
                <button type="button" aria-label="Increase quantity" disabled={clampedQty >= product.stockCount} onClick={() => setQuantity((q) => q + 1)} className="h-9 w-9 flex items-center justify-center rounded border border-zinc-300 bg-white hover:bg-zinc-100 disabled:opacity-40 font-medium">+</button>
              </div>
              <span className="text-xs text-zinc-400">{product.stockCount} available</span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button type="button" disabled={isOutOfStock} onClick={handleAddToCart} className={["w-full py-3 rounded font-medium transition-colors text-sm flex items-center justify-center gap-2", isOutOfStock ? "bg-zinc-300 text-zinc-500 cursor-not-allowed" : addedToCart ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"].join(" ")}>
              {isOutOfStock ? "Out of Stock" : addedToCart ? "\u2713 Added to Cart" : "Add to Cart"}
            </button>

            <button type="button" disabled={isOutOfStock} onClick={handleBuyNow} className={["w-full py-3 rounded font-medium transition-colors text-sm flex items-center justify-center gap-2", isOutOfStock ? "bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-200" : "bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50"].join(" ")}>
              <ShoppingBag className="h-4 w-4" aria-hidden />
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <ToastProvider>
      <PDPInner />
    </ToastProvider>
  );
}