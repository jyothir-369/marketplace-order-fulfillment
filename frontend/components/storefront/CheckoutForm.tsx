/**
 * CheckoutForm — react-hook-form + Zod checkout form (§3.1.4).
 *
 * Mirrors the backend `CheckoutDto` schema:
 *   - shippingAddress: 5-500 characters
 *   - buyerId: from session (constant for now)
 *   - items: derived from the cart store
 *
 * Submits via the `checkoutOrder` API and clears the cart on success.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, CheckCircle2, ShoppingCart } from "lucide-react";
import {
  useCartStore,
  selectCart,
  selectTotalAmount,
} from "@/context/CartStore";
import { checkoutOrder } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const BUYER_ID = "00000000-0000-0000-0000-000000000001";

const MIN_ADDRESS_LENGTH = 5;
const MAX_ADDRESS_LENGTH = 500;

// Zod schema mirrors the backend CheckoutDto constraints.
const checkoutSchema = z.object({
  shippingAddress: z
    .string()
    .trim()
    .min(MIN_ADDRESS_LENGTH, `Address must be at least ${MIN_ADDRESS_LENGTH} characters.`)
    .max(MAX_ADDRESS_LENGTH, `Address must be no more than ${MAX_ADDRESS_LENGTH} characters.`),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

function CheckoutInner() {
  const router = useRouter();
  const { push: toast } = useToast();
  const cart = useCartStore(selectCart);
  const totalAmount = useCartStore(selectTotalAmount);
  const clearCart = useCartStore((s) => s.clearCart);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { shippingAddress: "" },
    mode: "onTouched",
  });

  const addressValue = watch("shippingAddress") ?? "";

  if (cart.length === 0 && !submitted) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <EmptyState
          icon={<ShoppingCart size={48} aria-hidden />}
          title="Your cart is empty"
          description="Add some products before checking out."
          action={
            <Link
              href="/products"
              className="px-5 py-2.5 rounded-md font-medium bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90"
            >
              Browse Catalog
            </Link>
          }
        />
      </div>
    );
  }

  if (submitted && orderId) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <CheckCircle2
          className="h-16 w-16 text-[var(--color-success)] mx-auto mb-4"
          aria-hidden
        />
        <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          Order Placed!
        </h1>
        <p className="text-[var(--color-muted-foreground)] mb-6">
          Redirecting to your order confirmation...
        </p>
        <Link
          href={`/orders/${orderId}`}
          className="px-5 py-2.5 rounded-md font-medium bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90"
        >
          View Order
        </Link>
      </div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const res = await checkoutOrder({
        buyerId: BUYER_ID,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: values.shippingAddress.trim(),
      });
      if (!res.success || !res.order) throw new Error(res.message);
      const createdOrderId = res.order.id;
      clearCart();
      setOrderId(createdOrderId);
      setSubmitted(true);
      toast("Order placed successfully!", "success");
      setTimeout(() => router.push(`/orders/${createdOrderId}`), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed.";
      const sc =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode: number }).statusCode
          : 0;
      if (sc === 409) {
        toast("One of your items just sold out. Please review your cart.", "warning");
      } else {
        toast(msg, "error");
      }
      setSubmitError(msg);
    }
  });

  const addressError = errors.shippingAddress?.message;
  const taClass = cn(
    "w-full rounded-md p-2 text-sm",
    "border bg-[var(--color-background)] text-[var(--color-foreground)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]",
    addressError
      ? "border-[var(--color-destructive)]"
      : "border-[var(--color-border)]"
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Checkout</h1>

      {/* Cart summary */}
      <section
        aria-label="Cart summary"
        className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)]"
      >
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
            <tr>
              <th className="p-3 text-left font-semibold text-[var(--color-foreground)]">
                Item
              </th>
              <th className="p-3 w-24 font-semibold text-[var(--color-foreground)]">
                Qty
              </th>
              <th className="p-3 text-right w-28 font-semibold text-[var(--color-foreground)]">
                Total
              </th>
              <th className="p-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {cart.map((item) => (
              <tr key={item.productId}>
                <td className="p-3">
                  <div className="font-medium text-[var(--color-foreground)]">
                    {item.name}
                  </div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    by {item.vendorName}
                  </div>
                  <div className="text-xs text-[var(--color-muted-foreground)] tabular-nums">
                    {formatCurrency(item.price)} each
                  </div>
                </td>
                <td className="p-3">
                  <label htmlFor={`qty-${item.productId}`} className="sr-only">
                    Quantity for {item.name}
                  </label>
                  <input
                    id={`qty-${item.productId}`}
                    type="number"
                    min={1}
                    max={item.maxStock}
                    value={item.quantity}
                    disabled={isSubmitting}
                    onChange={(e) =>
                      updateQuantity(item.productId, parseInt(e.target.value, 10) || 1)
                    }
                    className="w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm tabular-nums text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] disabled:opacity-50"
                  />
                </td>
                <td className="p-3 text-right font-medium tabular-nums text-[var(--color-foreground)]">
                  {formatCurrency(item.price * item.quantity)}
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId)}
                    disabled={isSubmitting}
                    className="text-xs text-[var(--color-destructive)] hover:opacity-80 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[var(--color-muted)] border-t border-[var(--color-border)]">
            <tr>
              <td
                colSpan={2}
                className="p-3 text-right font-bold text-base text-[var(--color-foreground)]"
              >
                Order total
              </td>
              <td className="p-3 text-right font-bold text-xl tabular-nums text-[var(--color-foreground)]">
                {formatCurrency(totalAmount)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Address form */}
      <form onSubmit={onSubmit} noValidate>
        <fieldset
          disabled={isSubmitting}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3"
        >
          <legend className="text-base font-semibold text-[var(--color-foreground)] px-1">
            Shipping address
          </legend>
          <div>
            <label
              htmlFor="shippingAddress"
              className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
            >
              Full address <span className="text-[var(--color-destructive)]">*</span>
            </label>
            <textarea
              id="shippingAddress"
              rows={3}
              minLength={MIN_ADDRESS_LENGTH}
              maxLength={MAX_ADDRESS_LENGTH}
              required
              placeholder="123 Main St, Apt 4B, City, State, ZIP, Country"
              aria-invalid={addressError ? "true" : "false"}
              aria-describedby={addressError ? "address-error" : "address-help"}
              className={taClass}
              {...register("shippingAddress")}
            />
            {addressError && (
              <p
                id="address-error"
                role="alert"
                className="text-xs mt-1 text-[var(--color-destructive)]"
              >
                {addressError}
              </p>
            )}
            <p
              id="address-help"
              className="text-xs mt-1 text-[var(--color-muted-foreground)]"
            >
              {addressValue.length} / {MAX_ADDRESS_LENGTH} characters
            </p>
          </div>
        </fieldset>

        {submitError && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] p-3 text-sm flex items-start gap-2"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Link
            href="/products"
            className="px-4 py-2.5 rounded-md border border-[var(--color-border)] text-center text-sm text-[var(--color-foreground)] hover:bg-[var(--color-accent)] disabled:opacity-50"
            aria-disabled={isSubmitting}
          >
            Continue shopping
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || cart.length === 0}
            className={cn(
              "flex-1 rounded-md px-4 py-2.5 font-medium text-sm",
              "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
              "hover:opacity-90 disabled:opacity-50",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ring)]"
            )}
          >
            {isSubmitting
              ? "Placing order…"
              : `Place Order — ${formatCurrency(totalAmount)}`}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CheckoutForm() {
  return (
    <ToastProvider>
      <CheckoutInner />
    </ToastProvider>
  );
}
