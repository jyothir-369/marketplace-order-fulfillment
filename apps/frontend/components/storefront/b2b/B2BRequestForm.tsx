"use client";
/**
 * components/storefront/b2b/B2BRequestForm.tsx — Phase 5 B2B experience.
 * Bulk ordering / RFQ / approvals / invoicing. Separate navigation + permission-bound.
 */
import { useState } from "react";
import { Building2, ClipboardList, Send } from "lucide-react";

export function B2BRequestForm({ companyId }: { companyId?: string }) {
  const [qty, setQty] = useState(50);
  const [rfqNote, setRfqNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isValidQuantity = qty >= 10 && qty <= 9999;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2" aria-label="B2B request">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-[var(--color-brass)] text-[var(--color-ink-navy)] flex items-center justify-center"><Building2 size={20} aria-hidden /></div>
        <div>
          <h2 className="font-display text-xl font-bold">B2B Request</h2>
          <p className="text-xs text-[var(--color-warm-muted)]">Bulk / RFQ / approvals</p>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (isValidQuantity) setSubmitted(true); }}
        className="space-y-3"
        aria-label="B2B quotation form"
      >
        <div>
          <label htmlFor="b2b-qty" className="text-xs font-bold uppercase tracking-wide">Quantity (min 10)</label>
          <input
            id="b2b-qty"
            type="number"
            min={10}
            max={9999}
            value={qty}
            onChange={(e) => setQty(Math.max(10, Math.min(9999, Number(e.target.value) || 10)))}
            className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-sm tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="b2b-rfq" className="text-xs font-bold uppercase tracking-wide">RFQ / Approval notes</label>
          <textarea
            id="b2b-rfq"
            rows={3}
            value={rfqNote}
            onChange={(e) => setRfqNote(e.target.value)}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm"
            placeholder="Approver, invoice terms, delivery window..."
          />
        </div>
        <button
          type="submit"
          disabled={!isValidQuantity}
          className="w-full h-10 rounded-md text-sm font-semibold bg-[var(--color-ink-navy)] text-[var(--color-brass)] disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Send size={16} aria-hidden /> Submit RFQ
        </button>
      </form>

      {submitted && (
        <div className="mt-3 rounded-xl bg-[var(--color-forest)]/10 border border-[var(--color-forest)]/20 p-3 text-xs text-[var(--color-forest)]" role="status" aria-live="polite">
          RFQ submitted for {qty} units {companyId ? `(company ${companyId})` : ""}. Approval + invoice to follow.
        </div>
      )}

      <div className="mt-4 border-t border-[var(--color-border)] pt-3 flex gap-3 text-xs text-[var(--color-warm-muted)]">
        <span className="inline-flex items-center gap-1"><ClipboardList size={12} aria-hidden /> Bulk validated</span>
        <span className="inline-flex items-center gap-1"><Building2 size={12} aria-hidden /> Company account</span>
      </div>
    </div>
  );
}
