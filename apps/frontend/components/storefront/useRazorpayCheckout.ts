import { useState, useCallback } from "react";
import {
  initiateRazorpayOrder,
  verifyRazorpayPayment,
  type RazorpayInitiationResponse,
} from "@/lib/api";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

type VerifiedCheckout = {
  initiation: RazorpayInitiationResponse;
  orderId: string;
  paymentId: string;
};

export function useRazorpayCheckout(
  cart: Array<{ productId: string; quantity: number }>,
  shippingAddress: string,
) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const start = useCallback(async (): Promise<VerifiedCheckout> => {
    setLoading(true);
    setStatus("initiating");

    try {
      if (!shippingAddress || shippingAddress.trim().length < 5) {
        throw new Error("Please enter a valid shipping address.");
      }

      if (cart.length === 0) {
        throw new Error("Your cart is empty.");
      }

      const init = await initiateRazorpayOrder({
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        shippingAddress: shippingAddress.trim(),
      });

      if (
        !init.success ||
        !init.orderId ||
        !init.providerOrderId ||
        !init.publicKeyId
      ) {
        throw new Error("The server could not initiate Razorpay checkout.");
      }

      if (typeof window === "undefined") {
        throw new Error("Razorpay checkout must run in the browser.");
      }

      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => {
            script.remove();
            reject(new Error("Razorpay Checkout could not be loaded. Check your network and try again."));
          };
          document.head.appendChild(script);
        });
      }

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout loaded but was not available.");
      }

      // This promise resolves only after the backend verifies the payment.
      const verified = await new Promise<{ orderId: string; paymentId: string }>(
        (resolve, reject) => {
          let settled = false;
          let verificationStarted = false;

          const rejectOnce = (error: unknown) => {
            if (settled) return;
            settled = true;
            reject(
              error instanceof Error
                ? error
                : new Error("Payment could not be verified."),
            );
          };

          const razorpay = new window.Razorpay({
            key: init.publicKeyId,
            amount: init.amountPaise,
            currency: init.currency,
            name: "Marketplace",
            order_id: init.providerOrderId,
            notes: { source: "checkout-form" },

            handler: async (response: any) => {
              if (settled || verificationStarted) return;
              verificationStarted = true;
              setStatus("verifying");

              try {
                if (
                  !response?.razorpay_payment_id ||
                  !response?.razorpay_signature
                ) {
                  throw new Error("Razorpay returned an incomplete payment response.");
                }

                const result = await verifyRazorpayPayment({
                  razorpay_order_id: init.providerOrderId,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });

                if (result?.verified !== true || !result.orderId || !result.paymentId) {
                  throw new Error(
                    "The server did not verify this payment. Check the order status before retrying.",
                  );
                }

                settled = true;
                setStatus("verified");
                resolve({
                  orderId: result.orderId,
                  paymentId: result.paymentId,
                });
              } catch (error: unknown) {
                setStatus("error");
                rejectOnce(error);
              }
            },

            modal: {
              escape: false,
              backdropclose: false,
              ondismiss: () => {
                // Do not interrupt an in-flight server verification.
                if (verificationStarted || settled) return;

                setStatus("dismissed");
                rejectOnce(
                  new Error(
                    "Payment was closed before verification completed. Check the order status before retrying.",
                  ),
                );
              },
            },
          });

          razorpay.on("payment.failed", () => {
            if (settled || verificationStarted) return;

            // Razorpay can allow another attempt in the same modal.
            // Keep waiting; dismissal will reject if the buyer gives up.
            setStatus("payment-failed");
          });

          setStatus("checkout-open");
          razorpay.open();
        },
      );

      return {
        initiation: init,
        orderId: verified.orderId,
        paymentId: verified.paymentId,
      };
    } catch (error: unknown) {
      setStatus("error");
      throw error instanceof Error
        ? error
        : new Error("Razorpay checkout failed.");
    } finally {
      setLoading(false);
    }
  }, [cart, shippingAddress]);

  return { start, loading, status };
}