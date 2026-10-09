/**
 * Payment Provider Boundary — Phase 2 (GAP B).
 * Real architecture preserved: MockPaymentService isolated; no fake production gateway added.
 * Production requires external credentials/config (not available) — documented clearly.
 *
 * Required for production (external, not implemented):
 * - PAYMENT_PROVIDER=stripe | paypal | adyen (env)
 * - STRIPE_SECRET_KEY / PAYPAL_CLIENT_ID + SECRET (env only, never committed)
 * - Webhook endpoint verification keys (env / vault)
 *
 * Never expose secrets in source, logs, or commits.
 */
export interface RealPaymentProviderConfig {
  providerName: string;     // e.g. 'stripe', 'paypal'
  secretKey?: string;       // from process.env only
  webhookSecret?: string;   // from process.env only
  endpointBase?: string;    // optional override
}

export const PAYMENT_PRODUCTION_REQUIREMENTS = [
  "Provider selection environment variable (not implemented)",
  "Server-side secret storage (env / vault — NOT source)",
  "Webhook verification endpoint (not added — out of scope per instructions)",
  "Idempotency key generation for duplicate protection (backend already handles order-state; provider-level idempotency required for production)",
] as const;
