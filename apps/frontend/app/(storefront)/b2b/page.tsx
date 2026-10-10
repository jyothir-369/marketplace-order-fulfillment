/**
 * app/(storefront)/b2b/page.tsx — Phase 5 B2B portal entry (separate from buyer/v BUYER ONLY blocked via RBAC at layout if needed).
 * Uses B2BRequestForm; authorization boundary kept from buyer/vendor/admin.
 */
import { B2BRequestForm } from "@/components/storefront/b2b/B2BRequestForm";

export default function B2BPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6" aria-label="B2B portal">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2">B2B Portal</h1>
        <p className="text-sm text-[var(--color-warm-muted)]">Bulk ordering, RFQs, approvals, and invoicing for company accounts.</p>
      </div>
      <B2BRequestForm companyId="COMP-2026" />
      <section aria-label="B2B features" className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2">
        <h2 className="font-display text-xl font-bold mb-3">What B2B offers</h2>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm text-[var(--color-warm-muted)]">
          {["Quantity breaks validated (10–9999)", "RFQ + approval workflow", "Company account invoices", "Bulk order history", "Separate navigation from buyer portal"].map((t) => (
            <li key={t} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brass)]" aria-hidden /> {t}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
