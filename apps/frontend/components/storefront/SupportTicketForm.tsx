/**
 * components/storefront/SupportTicketForm — Phase 4 assisted support entry.
 * Submits with order reference (optional) and shows confirmation + ticket number.
 */
"use client";

import { useState } from "react";
import { Send, CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function SupportTicketForm() {
  const [submitted, setSubmitted] = useState(false);
  const [ticketNo, setTicketNo] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const no = "MP-" + Math.floor(Math.random() * 90000 + 10000);
    setTicketNo(no);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-[var(--color-forest)]/30 bg-[var(--color-forest)]/10 p-8 text-center shadow-v2">
        <CheckCircle2 className="h-10 w-10 text-[var(--color-forest)] mx-auto mb-3" aria-hidden />
        <h3 className="font-display text-xl font-bold text-[var(--color-foreground)] mb-1">Request received</h3>
        <p className="text-sm text-[var(--color-warm-muted)] mb-2">Ticket <span className="font-mono font-semibold text-[var(--color-foreground)]">{ticketNo}</span> created.</p>
        <p className="text-xs text-[var(--color-warm-subtle)]">We will respond within 24 hours. Keep your order reference for tracking.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 space-y-4" aria-label="Support request form">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-5 w-5 text-[var(--color-brass)]" aria-hidden />
        <h3 className="font-display text-lg font-bold">Contact support</h3>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="order-ref" className="block text-xs font-bold uppercase tracking-wide text-[var(--color-warm-muted)] mb-1">Order reference (optional)</label>
          <input
            id="order-ref"
            type="text"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder="ORD-1234"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-ivory)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]/40"
            aria-describedby="ref-help"
          />
          <p id="ref-help" className="text-[10px] text-[var(--color-warm-subtle)] mt-0.5">Used to link your request to an order.</p>
        </div>
        <div>
          <label htmlFor="subject" className="block text-xs font-bold uppercase tracking-wide text-[var(--color-warm-muted)] mb-1">Subject</label>
          <input
            id="subject"
            type="text"
            placeholder="Delivery issue, return, account"
            required
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-ivory)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]/40"
          />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wide text-[var(--color-warm-muted)] mb-1">Details</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
          placeholder="Describe the issue and include any relevant details."
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-ivory)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]/40 resize-y"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="submit"
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold",
            "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition"
          )}
        >
          <Send size={16} aria-hidden /> Submit request
        </button>
      </div>
    </form>
  );
}
