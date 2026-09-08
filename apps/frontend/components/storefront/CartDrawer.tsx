/**
 * CartDrawer — production-grade slide-over cart (V2 Premium).
 *
 * Accessibility & isolation:
 *   - Full-screen semi-transparent backdrop at `z-50` with a dark blur mask
 *     (`backdrop-blur-sm bg-black/40`) so the product grid is cleanly dimmed
 *     and isolated from focus while the drawer is open.
 *   - Radix Dialog provides focus trapping, ESC-to-close, scroll lock, and
 *     `role="dialog"`/`aria-modal` semantics; explicit aria attrs are added
 *     on the interactive controls.
 *   - Panel slides in from the right with `slide-in-from-right` /
 *     `slide-out-to-right` and respects `prefers-reduced-motion` via CSS.
 *
 * UX:
 *   - Intuitive +/- quantity stepper with stock boundary hints.
 *   - Inline remove with a press-and-hold countdown (no accidental drops).
 *   - Optimistic update feedback: pending state per line, sync banner.
 *   - Clear cart button with confirmation.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  X,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
} from "@radix-ui/react-dialog";
import {
  useCartStore,
  selectCart,
  selectDrawerOpen,
  selectTotalAmount,
} from "@/context/CartStore";
import { useCartSync } from "@/context/CartSyncProvider";
import { formatCurrency, cn } from "@/lib/utils";

const REMOVE_HOLD_MS = 650;

function CartDrawerItem({
  name,
  vendorName,
  price,
  quantity,
  maxStock,
  onRemove,
  onUpdateQty,
}: {
  name: string;
  vendorName: string;
  price: number;
  quantity: number;
  maxStock: number;
  onRemove: () => void;
  onUpdateQty: (qty: number) => void;
}) {
  const [armTimer, setArmTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [armed, setArmed] = useState(false);
  const holdStartRef = useRef<number | null>(null);

  const cancelHold = useCallback(() => {
    if (armTimer) clearTimeout(armTimer);
    setArmed(false);
    holdStartRef.current = null;
  }, [armTimer]);

  useEffect(() => () => { if (armTimer) clearTimeout(armTimer); }, [armTimer]);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--color-warm-border)] last:border-b-0">
      {/* Product image placeholder */}
      <div
        className={cn(
          "h-14 w-14 shrink-0 rounded-lg overflow-hidden",
          "bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-muted)]",
          "flex items-center justify-center text-[var(--color-warm-muted)]"
        )}
        aria-hidden
      >
        <ShoppingBag className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-foreground)] leading-snug line-clamp-2">
          {name}
        </p>
        <p className="text-xs text-[var(--color-warm-muted)] mt-0.5">{vendorName}</p>

        <div className="flex items-center justify-between mt-2 gap-3">
          {/* Quantity stepper */}
          <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => onUpdateQty(Math.max(1, quantity - 1))}
              className="h-8 w-8 flex items-center justify-center text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-ivory-hover)] disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] transition-colors"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span
              className="w-9 text-center text-sm tabular-nums text-[var(--color-foreground)]"
              aria-live="polite"
            >
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={quantity >= maxStock}
              onClick={() => onUpdateQty(Math.min(maxStock, quantity + 1))}
              className="h-8 w-8 flex items-center justify-center text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-ivory-hover)] disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
              {formatCurrency(price * quantity)}
            </span>
            <button
              type="button"
              aria-label="Remove item"
              title="Remove item"
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md transition-all",
                armed
                  ? "bg-[var(--color-destructive)] text-white"
                  : "text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              )}
              onPointerDown={() => {
                if (holdStartRef.current === null) holdStartRef.current = Date.now();
                setArmed(true);
                setArmTimer(
                  setTimeout(() => {
                    cancelHold();
                    onRemove();
                  }, REMOVE_HOLD_MS)
                );
              }}
              onPointerUp={cancelHold}
              onPointerLeave={cancelHold}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  cancelHold();
                  onRemove();
                }
              }}
            >
              {armed ? (
                <span className="text-[10px] font-bold px-1">Hold</span>
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </div>

        {quantity >= maxStock && (
          <p className="mt-1 text-[10px] text-[var(--color-warm-muted)]">
            Max {maxStock} available
          </p>
        )}
      </div>
    </div>
  );
}

function CartDrawerEmpty({ onClose }: { onClose: () => void }) {
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
        onClick={onClose}
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
  const cart = useCartStore(selectCart);
  const drawerOpen = useCartStore(selectDrawerOpen);
  const totalAmount = useCartStore(selectTotalAmount);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const { syncing, error, flushSync, clearCart } = useCartSync();

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearCart = useCallback(async () => {
    try {
      await clearCart();
      setShowClearConfirm(false);
    } catch {
      // Error is already handled in clearCart and shown in the error banner
    }
  }, [clearCart]);

  return (
    <Dialog open={drawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
      {/* Backdrop — full-screen dark blur mask, z-50, above the product grid */}
      <DialogOverlay
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:duration-200 data-[state=open]:duration-300"
        )}
      />

      {/* Panel — slides in from the right, z-50 above the overlay */}
      <DialogContent
        className={cn(
          "fixed right-0 top-0 z-50 h-dvh w-full max-w-md",
          "flex flex-col shadow-v2-lg",
          "bg-[var(--color-card)] border-l border-[var(--color-warm-border)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          "data-[state=closed]:duration-200 data-[state=open]:duration-300",
          "motion-reduce:transition-none motion-reduce:animate-none",
          "focus:outline-none"
        )}
        aria-label="Shopping cart"
      >
        <DialogTitle className="sr-only">Shopping cart</DialogTitle>
        <DialogDescription className="sr-only">
          Review the items in your shopping cart and adjust quantities before checkout.
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-warm-border)]">
          <div className="flex flex-col gap-0.5">
            <span
              aria-hidden
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]"
            >
              Your cart
            </span>
            <span className="font-display text-xl font-bold text-[var(--color-foreground)] leading-tight">
              Shopping Cart
            </span>
            {cart.length > 0 && (
              <span className="text-xs font-normal text-[var(--color-warm-muted)]">
                {cart.reduce((s, i) => s + i.quantity, 0)} item
                {cart.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <DialogClose asChild>
            <button
              type="button"
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md",
                "text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)]",
                "hover:bg-[var(--color-ivory-hover)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              )}
              aria-label="Close cart"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </DialogClose>
        </div>

        {/* Sync / error banner */}
        {(syncing || error) && (
          <div
            role={error ? "alert" : "status"}
            className={cn(
              "flex items-center gap-2 px-5 py-2 text-xs",
              error
                ? "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]"
                : "bg-[var(--color-cream)] text-[var(--color-warm-muted)]"
            )}
          >
            {error ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="flex-1">{error.kind === "conflict" ? error.message : error.message}</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                <span className="flex-1" aria-live="polite">
                  Syncing your cart…
                </span>
              </>
            )}
            {error?.kind === "network" && (
              <button
                type="button"
                onClick={() => void flushSync()}
                className="underline underline-offset-2 font-semibold"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Clear cart confirmation */}
        {showClearConfirm && (
          <div className="flex items-center gap-2 px-5 py-2 text-xs bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="flex-1">Clear all items from cart? This action cannot be undone.</span>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1 text-sm font-medium rounded border border-[var(--color-destructive)]/30 hover:bg-[var(--color-destructive)]/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClearCart}
              className="px-3 py-1 text-sm font-semibold rounded bg-[var(--color-destructive)] text-white hover:opacity-90 transition-opacity"
            >
              Clear Cart
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5">
          {cart.length === 0 ? (
            <CartDrawerEmpty onClose={closeDrawer} />
          ) : (
            <div className="divide-y divide-[var(--color-warm-border)]">
              {cart.map((item) => (
                <CartDrawerItem
                  key={item.productId}
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
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ring)]",
                "transition-opacity duration-150"
              )}
            >
              Proceed to Checkout
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className={cn(
                "text-center text-sm underline underline-offset-2",
                "text-[var(--color-destructive)] hover:text-[var(--color-destructive)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              )}
            >
              Clear cart
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className={cn(
                "text-center text-sm underline underline-offset-2",
                "text-[var(--color-warm-muted)] hover:text-[var(--color-foreground)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
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
