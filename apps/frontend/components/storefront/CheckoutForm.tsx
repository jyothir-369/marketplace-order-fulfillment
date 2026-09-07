/**
 * CheckoutForm � react-hook-form + Zod checkout form (�3.1.4).
 *
 * Mirrors the backend `CheckoutDto` schema:
 *   - shippingAddress: 5-500 characters
 *   - buyerId: from session (constant for now)
 *   - items: derived from the cart store
 *
 * Submits via the `checkoutOrder` API and clears the cart on success.
 *
 * V2 Premium visual treatment:
 *   - Editorial stepper header with brass active rule
 *   - Serif page heading (Playfair Display)
 *   - Warm hairline borders, ivory card surfaces
 *   - Ink navy primary CTA, warm secondary actions
 *   - Brass eyebrow labels
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, CheckCircle2, ShoppingCart, Truck, ClipboardList, PackageCheck } from "lucide-react";
import {
  useCartStore,
  selectCart,
  selectTotalAmount,
} from "@/context/CartStore";
import { checkoutOrder } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { formatCurrency, cn } from "@/lib/utils";

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

const STEPS: ReadonlyArray<{
  key: "cart" | "shipping" | "review" | "confirm";
  label: string;
  Icon: typeof Truck;
}> = [
  { key: "cart",     label: "Cart",     Icon: ShoppingCart },
  { key: "shipping", label: "Shipping", Icon: Truck },
  { key: "review",   label: "Review",   Icon: ClipboardList },
  { key: "confirm",  label: "Confirm",  Icon: PackageCheck },
];

function CheckoutStepper() {
  return (
    <ol
      className="mb-8 flex items-center justify-center gap-2 sm:gap-4"
      aria-label="Checkout progress"
    >
      {STEPS.map((step, i) => {
        const isActive = i <= 1; // cart + shipping are user-facing steps here
        return (
          <li key={step.key} className="flex items-center gap-2 sm:gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border",
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent"
                  : "bg-[var(--color-card)] text-[var(--color-warm-muted)] border-[var(--color-warm-border)]"
              )}
              aria-current={i === 1 ? "step" : undefined}
            >
              <step.Icon className="h-3.5 w-3.5" aria-hidden />
            </div>
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-[0.14em] hidden sm:inline",
                isActive
                  ? "text-[var(--color-foreground)]"
                  : "text-[var(--color-warm-subtle)]"
              )}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "h-px w-6 sm:w-10",
                  isActive && i < 1
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-warm-border)]"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

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
              className="px-5 py-2.5 rounded-md font-semibold bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
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
        <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-ivory-muted)]">
          <CheckCircle2
            className="h-10 w-10 text-[var(--color-success)]"
            aria-hidden
          />
        </div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)] mb-1">
          Order placed
        </p>
        <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)] mb-2">
          Thank you for your order
        </h1>
        <p className="text-sm text-[var(--color-warm-muted)] mb-6">
          Redirecting to your order confirmation...
        </p>
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity shadow-v2"
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
    "w-full rounded-md border bg-[var(--color-card)] px-3 py-2 text-sm",
    "text-[var(--color-foreground)] placeholder:text-[var(--color-warm-subtle)]",
    "border-[var(--color-border)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-ring)] focus:outline-none",
    "disabled:opacity-50 resize-y",
    addressError && "border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]"
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Editorial page header */}
      <div className="mb-6 text-center">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)] mb-1">
          Checkout
        </p>
        <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)]">
          Complete your order
        </h1>
      </div>

      <CheckoutStepper />

      {/* Cart summary table */}
      <section
        className="rounded-2xl border border-[var(--color-warm-border)] bg-[var(--color-card)] overflow-hidden mb-6 shadow-v2"
        aria-label="Order summary"
      >
        <div className="px-4 py-3 border-b border-[var(--color-warm-border)] bg-[var(--color-ivory)] flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-warm-muted)]">
            Order summary
          </h2>
          <span className="text-xs text-[var(--color-warm-muted)]">
            {cart.length} item{cart.length !== 1 ? "s" : ""}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-warm-border)]">
              <th scope="col" className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-warm-muted)]">Product</th>
              <th scope="col" className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-warm-muted)]">Qty</th>
              <th scope="col" className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-warm-muted)]">Total</th>
              <th scope="col" className="p-3" />
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => (
              <tr key={item.productId} className="border-b border-[var(--color-warm-border)] last:border-b-0">
                <td className="p-3">
                  <p className="font-medium text-[var(--color-foreground)]">{item.name}</p>
                  <p className="text-xs text-[var(--color-warm-muted)] mt-0.5">{item.vendorName}</p>
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    min={1}
                    max={item.maxStock}
                    value={item.quantity}
                    disabled={isSubmitting}
                    onChange={(e) =>
                      updateQuantity(item.productId, parseInt(e.target.value, 10) || 1)
                    }
                    className="w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm tabular-nums text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-accent)] disabled:opacity-50"
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
                    className="text-xs text-[var(--color-destructive)] hover:opacity-80 disabled:opacity-50 underline underline-offset-2"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[var(--color-ivory)] border-t border-[var(--color-warm-border)]">
            <tr>
              <td
                colSpan={2}
                className="p-3 text-right text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-warm-muted)]"
              >
                Order total
              </td>
              <td className="p-3 text-right font-display text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
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
          className="rounded-2xl border border-[var(--color-warm-border)] bg-[var(--color-card)] p-5 space-y-3 shadow-v2"
        >
          <legend className="font-display text-lg font-semibold text-[var(--color-foreground)] px-1">
            Shipping address
          </legend>
          <div>
            <label
              htmlFor="shippingAddress"
              className="block text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-warm-muted)] mb-1.5"
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
              className="text-xs mt-1 text-[var(--color-warm-muted)]"
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

        <div className="flex gap-3 pt-5">
          <Link
            href="/products"
            className="px-4 py-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-center text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-ivory-hover)] hover:border-[var(--color-warm-border-strong)] disabled:opacity-50 transition-colors"
            aria-disabled={isSubmitting}
          >
            Continue shopping
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || cart.length === 0}
            className={cn(
              "flex-1 rounded-md px-4 py-2.5 font-semibold text-sm shadow-v2",
              "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
              "hover:opacity-90 disabled:opacity-50",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ring)]",
              "transition-opacity"
            )}
          >
            {isSubmitting
              ? "Placing order�"
              : `Place Order � ${formatCurrency(totalAmount)}`}
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
