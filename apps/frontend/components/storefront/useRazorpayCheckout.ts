import { useState, useCallback } from "react";
import { initiateRazorpayOrder, verifyRazorpayPayment } from "@/lib/api";

declare global { interface Window { Razorpay?: any; } }

export function useRazorpayCheckout(cart: Array<{ productId: string; quantity: number }>, shippingAddress: string) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const start = useCallback(async () => {
    setLoading(true); setStatus("initiating");
    try {
      if (!shippingAddress || shippingAddress.trim().length < 5) throw new Error("Invalid address");
      if (cart.length === 0) throw new Error("Empty cart");
      const init = await initiateRazorpayOrder({ items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })), shippingAddress: shippingAddress.trim() });
      if (!init.success || !init.providerOrderId) throw new Error("Initiation failed");
      if (typeof window === "undefined") throw new Error("Client only");
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error("Script load failed"));
          document.body.appendChild(s);
        });
      }
      const rzp = new window.Razorpay({ key: init.publicKeyId, amount: init.amountPaise, currency: init.currency, name: "Marketplace", order_id: init.providerOrderId,
        handler: async (response: any) => {
          setStatus("verifying");
          const res = await verifyRazorpayPayment({ razorpay_order_id: init.providerOrderId, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature });
          if (res && res.verified === true) { setStatus("verified"); return { verified: true, orderId: res.orderId }; }
          throw new Error("Verification rejected");
        },
        modal: { escape: false, backdropclose: false }, notes: { source: "checkout-form" },
      });
      rzp.on("payment.failed", () => setStatus("payment-failed"));
      rzp.open(); setStatus("checkout-open");
      return { initiation: init, rzp };
    } catch (e: any) { setStatus("error"); throw e; } finally { setLoading(false); }
  }, [cart, shippingAddress]);
  return { start, loading, status };
}
