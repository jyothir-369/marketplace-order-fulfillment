/**
 * CartDrawer � slide-over cart panel (�3.1.3).
 *
 * Uses Radix Dialog for accessibility (focus trap, ESC-to-close, scroll lock)
 * and CSS transitions for the slide animation.
 *
 * Visibility is driven by `useCartStore` (`drawerOpen` / `closeDrawer`).
 * Items are rendered directly from the cart store.
 *
 * V2 Premium visual treatment:
 *   - Warm ivory card surface with hairline warm border
 *   - Serif panel title with brass eyebrow
 *   - Brass primary CTA for "Proceed to Checkout"
 *   - Warm gradient product image placeholder
 *   - Serif total in Playfair Display
 */

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogOverlay,
  DialogTitle,
} from "@radix-ui/react-dialog";
import {
  useCartStore,
  selectCart,
  selectDrawerOpen,
  selectTotalAmount,
} from "@/context/CartStore";
import { formatCurrency, cn } from "@/lib/utils";

function CartDrawerItem({
  productId,
  name,
  vendorName,
  price,
  quantity,
  maxStock,
  onRemove,
  onUpdateQty,
}: {
  productId: string;
  name: string;
  vendorName: string;
  price: number;
  quantity: number;
  maxStock: number;
  onRemove: () => void;
  onUpdateQty: (qty: number) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3",
        "border-b border-[var(--color-warm-border)] last:border-b-0"
      )}
    >
      {/* Product image placeholder � warm gradient block */}
      <div
        className={cn(
          "h-14 w-14 shrink-0 rounded-lg overflow-hidden",
          "bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-muted)]",
          "flex items-center justify-center",
          "text-[var(--color-warm-muted)]"
        )}
        aria-hidden
      >
        <ShoppingBag className="h-5 w-5" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-foreground)] leading-snug line-clamp-2">
          {name}
        </p>
        <p className="text-xs text-[var(--color-warm-muted)] mt-0.5">
          {vendorName}
        </p>
        <div className="flex items-center justify-between mt-2">
          {/* Quantity stepper */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => onUpdateQty(Math.max(1, quantity - 1))}
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded-md text-xs",
                "border border-[var(--color-border)] bg-[var(--color-card)]",
                "hover:bg-[var(--color-ivory-hover)] hover:border-[var(--color-warm-border-strong)]",
                "disabled:opacity-40 disabled:pointer-events-none"
              )}
            >
              <Minus className="h-3 w-3" aria-hidden />
            </button>
            <span
              className="w-7 text-center text-sm tabular-nums text-[var(--color-foreground)]"
              aria-label={`Quantity: ${quantity}`}
            >
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={quantity >= maxStock}
              onClick={() => onUpdateQty(Math.min(maxStock, quantity + 1))}
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded-md text-xs",
                "border border-[var(--color-border)] bg-[var(--color-card)]",
                "hover:bg-[var(--color-ivory-hover)] hover:border-[var(--color-warm-border-strong)]",
                "disabled:opacity-40 disabled:pointer-events-none"
              )}
            >
              <Plus className="h-3 w-3" aria-hidden />
            </button>
          </div>

          {/* Line total + remove */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
              {formatCurrency(price * quantity)}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className={cn(
                "text-xs underline underline-offset-2",
                "text-[var(--color-destructive)] hover:opacity-80"
              )}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartDrawerEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
      <div className="rounded-full bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-ivory-muted)] p-4 text-[var(--color-warm-muted)]">
        <ShoppingBag className="h-8 w-8" aria-hidden />
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-[var(--color-foreground)]">
          Your cart is empty
        </p>
        <p className="text-xs text-[var(--color-warm-muted)] mt-1">
          Add products from the catalog to get started.
        </p>
      </div>
      <Link
        href="/products"
        className={cn(
          "mt-2 inline-flex items-center gap-1.5",
          "px-4 py-2 rounded-md text-sm font-semibold",
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
          "hover:opacity-90 transition-opacity",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ring)]"
        )}
      >
        Browse catalog
      </Link>
    </div>
  );
}

export function CartDrawer() {
  const isOpen = useCartStore(selectDrawerOpen);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const cart = useCartStore(selectCart);
  const totalAmount = useCartStore(selectTotalAmount);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeDrawer(); }}>
      {/* Backdrop */}
      <DialogOverlay
        className={cn(
          "fixed inset-0 z-50",
          "bg-[var(--color-foreground)]/15 backdrop-blur-[2px]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:duration-200 data-[state=open]:duration-300"
        )}
      />

      {/* Panel � slides in from the right */}
      <DialogContent
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md",
          "flex flex-col shadow-v2-lg",
          "bg-[var(--color-card)] border-l border-[var(--color-warm-border)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          "data-[state=closed]:duration-200 data-[state=open]:duration-300",
          "focus:outline-none"
        )}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between px-5 py-4",
            "border-b border-[var(--color-warm-border)]"
          )}
        >
          <DialogTitle className="flex flex-col gap-0.5">
            {/* Brass eyebrow */}
            <span
              aria-hidden
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]"
            >
              Your cart
            </span>
            {/* Serif title */}
            <span className="font-display text-xl font-bold text-[var(--color-foreground)] leading-tight">
              Shopping Cart
            </span>
            {cart.length > 0 && (
              <span className="text-xs font-normal text-[var(--color-warm-muted)]">
                {cart.length} item{cart.length !== 1 ? "s" : ""}
              </span>
            )}
          </DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md",
                "text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)]",
                "hover:bg-[var(--color-ivory-hover)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              )}
              aria-label="Close cart"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </DialogClose>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5">
          {cart.length === 0 ? (
            <CartDrawerEmpty />
          ) : (
            <div className="divide-y divide-[var(--color-warm-border)]">
              {cart.map((item) => (
                <CartDrawerItem
                  key={item.productId}
                  productId={item.productId}
                  name={item.name}
                  vendorName={item.vendorName}
                  price={item.price}
                  quantity={item.quantity}
                  maxStock={item.maxStock}
                  onRemove={() => removeFromCart(item.productId)}
                  onUpdateQty={(qty) => updateQuantity(item.productId, qty)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div
            className={cn(
              "flex flex-col gap-3 px-5 py-4",
              "border-t border-[var(--color-warm-border)]",
              "bg-[var(--color-ivory)]"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-warm-muted)]">
                Subtotal
              </span>
              <span className="font-display text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-5 py-3",
                "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
                "font-semibold text-sm shadow-v2",
                "hover:opacity-90",
                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ring)]",
                "transition-opacity duration-150"
              )}
            >
              Proceed to Checkout
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={closeDrawer}
              className={cn(
                "text-center text-sm underline underline-offset-2",
                "text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              Continue shopping
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
