/**
 * app/(storefront)/checkout/page.tsx — Buyer checkout (§3.1.4).
 *
 * Renders the CheckoutForm which owns the RHF + Zod validation, the
 * cart summary table, and the address submission flow.
 */

import { CheckoutForm } from "@/components/storefront/CheckoutForm";

export default function CheckoutPage() {
  return <CheckoutForm />;
}
