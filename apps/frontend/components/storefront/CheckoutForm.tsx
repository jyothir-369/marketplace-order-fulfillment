
/**
 * CheckoutForm — react-hook-form + Zod checkout form (§3.1.4).
 *
 * Uses the existing checkoutOrder API and PaymentStep mock-payment flow.
 * The buyer identity must be resolved by the authenticated backend.
 *
 * Shipping address:
 *   - Minimum 5 characters
 *   - Maximum 500 characters
 *
 * Clears the cart only after the backend confirms checkout success.
 *
 * V2 Premium visual treatment:
 *   - Editorial stepper header with brass active rule
 *   - Serif page heading (Playfair Display)
 *   - Warm hairline borders and ivory card surfaces
 *   - Ink navy primary CTA
 *   - Brass eyebrow labels
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
  Truck,
  ClipboardList,
  PackageCheck,
  CreditCard,
} from "lucide-react";

import {
  useCartStore,
  selectCart,
  selectTotalAmount,
} from "@/context/CartStore";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { formatCurrency, cn } from "@/lib/utils";
import { useRazorpayCheckout } from "@/components/storefront/useRazorpayCheckout";

const MIN_ADDRESS_LENGTH = 5;
const MAX_ADDRESS_LENGTH = 500;

const checkoutSchema = z.object({
  shippingAddress: z
    .string()
    .trim()
    .min(
      MIN_ADDRESS_LENGTH,
      `Address must be at least ${MIN_ADDRESS_LENGTH} characters.`,
    )
    .max(
      MAX_ADDRESS_LENGTH,
      `Address must be no more than ${MAX_ADDRESS_LENGTH} characters.`,
    ),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

const STEPS: ReadonlyArray<{
  key: "cart" | "shipping" | "review" | "confirm";
  label: string;
  Icon: typeof Truck;
}> = [
  { key: "cart", label: "Cart", Icon: ShoppingCart },
  { key: "shipping", label: "Shipping", Icon: Truck },
  { key: "review", label: "Review", Icon: ClipboardList },
  { key: "confirm", label: "Confirm", Icon: PackageCheck },
];

function CheckoutStepper() {
  return (
    <ol
      className="mb-8 flex items-center justify-center gap-2 sm:gap-4"
      aria-label="Checkout progress"
    >
      {STEPS.map((step, index) => {
        const isActive = index <= 1;

        return (
          <li
            key={step.key}
            className="flex items-center gap-2 sm:gap-3"
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border",
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent"
                  : "bg-[var(--color-card)] text-[var(--color-warm-muted)] border-[var(--color-warm-border)]",
              )}
              aria-current={index === 1 ? "step" : undefined}
            >
              <step.Icon
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
            </div>

            <span
              className={cn(
                "hidden text-xs font-semibold uppercase tracking-[0.14em] sm:inline",
                isActive
                  ? "text-[var(--color-foreground)]"
                  : "text-[var(--color-warm-subtle)]",
              )}
            >
              {step.label}
            </span>

            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px w-6 sm:w-10",
                  isActive && index < 1
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-warm-border)]",
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
  const clearCart = useCartStore((state) => state.clearCart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

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
    defaultValues: {
      shippingAddress: "",
    },
    mode: "onTouched",
  });

  const addressValue = watch("shippingAddress") ?? "";
  const addressError = errors.shippingAddress?.message;
  const {
    start: startRazorpayCheckout,
    loading: isLoadingPayment,
    status: checkoutStatus,
  } = useRazorpayCheckout(
    cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
    addressValue,
  );

  const onSubmit = handleSubmit(async (values) => {
    if (isSubmitting || cart.length === 0 || isLoadingPayment) return;

    setSubmitError(null);

    try {
      const result = await startRazorpayCheckout();

      if (!result.orderId || !result.paymentId) {
        throw new Error("Payment verification did not return a confirmed order.");
      }

      // Do not clear the cart or show success before server verification.
      clearCart();
      setOrderId(result.orderId);
      setSubmitted(true);

      toast("Payment verified successfully. Your order is confirmed.", "success");

      window.setTimeout(() => {
        router.push("/orders/" + result.orderId);
      }, 1500);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Payment failed or could not be verified.";

      setSubmitError(message);
      toast(message, "error");
    }
  });

  const textareaClass = cn(
    "w-full rounded-md border bg-[var(--color-card)] px-3 py-2 text-sm",
    "text-[var(--color-foreground)] placeholder:text-[var(--color-warm-subtle)]",
    "border-[var(--color-border)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-ring)] focus:outline-none",
    "disabled:opacity-50 resize-y",
    addressError &&
      "border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]",
  );

  if (cart.length === 0 && !submitted) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <EmptyState
          icon={<ShoppingCart size={48} aria-hidden="true" />}
          title="Your cart is empty"
          description="Add some products before checking out."
          action={
            <Link
              href="/products"
              className="rounded-md bg-[var(--color-primary)] px-5 py-2.5 font-semibold text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
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
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-ivory-muted)]">
          <CheckCircle2
            className="h-10 w-10 text-[var(--color-success)]"
            aria-hidden="true"
          />
        </div>

        <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Payment confirmed
        </p>

        <h1 className="mb-2 font-display text-3xl font-bold text-[var(--color-foreground)]">
          Thank you for your order
        </h1>

        <p className="mb-6 text-sm text-[var(--color-warm-muted)]">
          Redirecting to your order confirmation...
        </p>

        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-5 py-2.5 font-semibold text-[var(--color-primary-foreground)] shadow-v2 transition-opacity hover:opacity-90"
        >
          View Order
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Editorial page header */}
      <div className="mb-6 text-center">
        <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Checkout
        </p>

        <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)]">
          Complete your order
        </h1>
      </div>

      <CheckoutStepper />

      {/* Cart summary */}
      <section
        className="mb-6 overflow-hidden rounded-2xl border border-[var(--color-warm-border)] bg-[var(--color-card)] shadow-v2"
        aria-label="Order summary"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-warm-border)] bg-[var(--color-ivory)] px-4 py-3">
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
              <th
                scope="col"
                className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-warm-muted)]"
              >
                Product
              </th>
              <th
                scope="col"
                className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-warm-muted)]"
              >
                Qty
              </th>
              <th
                scope="col"
                className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-warm-muted)]"
              >
                Total
              </th>
              <th scope="col" className="p-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {cart.map((item) => (
              <tr
                key={item.productId}
                className="border-b border-[var(--color-warm-border)] last:border-b-0"
              >
                <td className="p-3">
                  <p className="font-medium text-[var(--color-foreground)]">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-warm-muted)]">
                    {item.vendorName}
                  </p>
                </td>

                <td className="p-3 text-center">
                  <input
                    type="number"
                    min={1}
                    max={item.maxStock}
                    value={item.quantity}
                    disabled={isSubmitting}
                    aria-label={`Quantity for ${item.name}`}
                    onChange={(event) => {
                      const quantity = Number.parseInt(
                        event.target.value,
                        10,
                      );

                      updateQuantity(
                        item.productId,
                        Number.isFinite(quantity) && quantity > 0
                          ? quantity
                          : 1,
                      );
                    }}
                    className="w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm tabular-nums text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] disabled:opacity-50"
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
                    className="text-xs text-[var(--color-destructive)] underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="border-t border-[var(--color-warm-border)] bg-[var(--color-ivory)]">
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

      {/* Existing mock-payment selection.
          This does not open Razorpay Checkout. */}
      <section
        className="mb-6 rounded-2xl border border-[var(--color-warm-border)] bg-[var(--color-card)] p-5 shadow-v2"
        aria-label="Payment"
      >
        <div className="mb-4 flex items-center gap-2">
          <CreditCard
            className="h-4 w-4 text-[var(--color-warm-muted)]"
            aria-hidden="true"
          />

          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-warm-muted)]">
            Payment
          </h2>
        </div>

        <p className="text-sm leading-6 text-[var(--color-warm-muted)]">
          Complete your payment securely using Razorpay Checkout. Order is
          confirmed only after server-side verification.
          {checkoutStatus ? ` Status: ${checkoutStatus}` : ""}
        </p>
      </section>

      {/* Shipping address and order submission */}
      <form onSubmit={onSubmit} noValidate>
        <fieldset
          disabled={isSubmitting}
          className="space-y-3 rounded-2xl border border-[var(--color-warm-border)] bg-[var(--color-card)] p-5 shadow-v2"
        >
          <legend className="px-1 font-display text-lg font-semibold text-[var(--color-foreground)]">
            Shipping address
          </legend>

          <div>
            <label
              htmlFor="shippingAddress"
              className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-warm-muted)]"
            >
              Full address{" "}
              <span className="text-[var(--color-destructive)]">*</span>
            </label>

            <textarea
              id="shippingAddress"
              rows={3}
              minLength={MIN_ADDRESS_LENGTH}
              maxLength={MAX_ADDRESS_LENGTH}
              required
              placeholder="123 Main St, Apt 4B, City, State, ZIP, Country"
              aria-invalid={addressError ? "true" : "false"}
              aria-describedby={
                addressError ? "address-error" : "address-help"
              }
              className={textareaClass}
              {...register("shippingAddress")}
            />

            {addressError && (
              <p
                id="address-error"
                role="alert"
                className="mt-1 text-xs text-[var(--color-destructive)]"
              >
                {addressError}
              </p>
            )}

            <p
              id="address-help"
              className="mt-1 text-xs text-[var(--color-warm-muted)]"
            >
              {addressValue.length} / {MAX_ADDRESS_LENGTH} characters
            </p>
          </div>
        </fieldset>

        {submitError && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-md border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 p-3 text-sm text-[var(--color-destructive)]"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex gap-3 pt-5">
          <Link
            href="/products"
            aria-disabled={isSubmitting}
            className={cn(
              "rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-center text-sm font-medium text-[var(--color-foreground)] transition-colors",
              "hover:border-[var(--color-warm-border-strong)] hover:bg-[var(--color-ivory-hover)]",
              isSubmitting && "pointer-events-none opacity-50",
            )}
          >
            Continue shopping
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || cart.length === 0}
            className={cn(
              "flex-1 rounded-md px-4 py-2.5 text-sm font-semibold shadow-v2",
              "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
              "transition-opacity hover:opacity-90 disabled:opacity-50",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2",
            )}
          >
            {isSubmitting
              ? "Placing order..."
              : `Place Order · ${formatCurrency(totalAmount)}`}
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