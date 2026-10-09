/**
 * app/(storefront)/cart/page.tsx — Cart page using existing store.
 */
"use client";
import Link from "next/link";
import { ShoppingCart, ArrowRight, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCartStore, selectCart, selectTotalAmount } from "@/context/CartStore";
import { formatCurrency, cn } from "@/lib/utils";

export default function CartPage() {
  const cart = useCartStore(selectCart);
  const totalAmount = useCartStore(selectTotalAmount);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  return (
    <main className="min-h-screen bg-[var(--color-cream)]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)] mb-8">Your Cart</h1>
        {cart.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-ivory-muted)] p-4 text-[var(--color-warm-muted)]">
              <ShoppingBag className="h-8 w-8" aria-hidden />
            </div>
            <p className="font-display text-lg font-semibold">Your cart is empty</p>
            <Link href="/products" className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-[var(--color-primary)] text-[var(--color-primary-foreground)]">Browse catalog</Link>
          </div>
        ) : (
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-warm-border)] shadow-v2 p-6 space-y-4">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-start gap-3 py-3 border-b border-[var(--color-warm-border)] last:border-0">
                <div className="h-14 w-14 shrink-0 rounded-lg bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-muted)] flex items-center justify-center text-[var(--color-warm-muted)]"><ShoppingBag className="h-5 w-5" aria-hidden /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-[var(--color-warm-muted)]">{item.vendorName}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))} className="h-7 w-7 flex items-center justify-center rounded-md text-xs border bg-[var(--color-card)]" aria-label="Decrease"><Minus className="h-3 w-3" /></button>
                      <span className="w-7 text-center text-sm tabular-nums">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, Math.min(item.maxStock, item.quantity + 1))} className="h-7 w-7 flex items-center justify-center rounded-md text-xs border bg-[var(--color-card)]" aria-label="Increase"><Plus className="h-3 w-3" /></button>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                    <button onClick={() => removeFromCart(item.productId)} className="text-xs underline text-[var(--color-destructive)]">Remove</button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-warm-border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-warm-muted)]">Subtotal</span>
              <span className="font-display text-2xl font-bold">{formatCurrency(totalAmount)}</span>
            </div>
            <Link href="/checkout" className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold text-sm shadow-v2 hover:opacity-90 transition-opacity">Proceed to Checkout <ArrowRight className="h-4 w-4" /></Link>
          </div>
        )}
      </div>
    </main>
  );
}
