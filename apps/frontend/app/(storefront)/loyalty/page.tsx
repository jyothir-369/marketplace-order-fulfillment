/**
 * app/(storefront)/loyalty/page.tsx — Phase 5 loyalty entry point.
 * Preserves buyer-only access (not vendor/admin/B2B).
 */
import { LoyaltySummary } from "@/components/storefront/loyalty/LoyaltySummary";

export default function LoyaltyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-8" aria-label="Loyalty program">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2">Loyalty</h1>
        <p className="text-sm text-[var(--color-warm-muted)]">Auditable points, tier benefits, and rewards — only available to buyer accounts.</p>
      </div>
      <LoyaltySummary userId="buyer-1" points={1240} audit={[
        { event: "earn", points: 240, reference: "Order #MP-102", at: "2026-09-24" },
        { event: "redeem", points: -100, reference: "Reward: Free shipping", at: "2026-09-20" },
        { event: "earn", points: 110, reference: "Order #MP-098", at: "2026-09-15" },
      ]} />
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2" aria-label="Tier benefits">
        <h2 className="font-display text-xl font-bold mb-3">Tier benefits</h2>
        <ul className="space-y-2 text-sm text-[var(--color-warm-muted)]">
          <li><strong>Silver (500+ pts):</strong> Exclusive deals and priority support.</li>
          <li><strong>Gold (2000+ pts):</strong> Free shipping eligibility and early access.</li>
          <li><strong>Platinum (5000+ pts):</strong> Premium rewards and dedicated service.</li>
        </ul>
      </section>
    </main>
  );
}
