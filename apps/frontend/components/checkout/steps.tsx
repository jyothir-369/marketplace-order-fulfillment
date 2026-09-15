"use client";

import { useState } from "react";
import { CreditCard, ShieldCheck, Truck } from "lucide-react";
import { useCartStore } from "@/context/CartStore";
import { cn } from "@/lib/utils";

export function PaymentStep() {
  const [selected, setSelected] = useState("mock-success");
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-[var(--color-foreground)]">Payment</h2>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-v2 space-y-3">
        <button onClick={() => setSelected("mock-success")} className={cn("w-full text-left px-4 py-3 rounded-lg border transition flex items-center gap-3", selected === "mock-success" ? "border-[var(--color-brass)] bg-[var(--color-ink-navy)]/5" : "border-[var(--color-border)] hover:border-[var(--color-brass)]")}>
          <CreditCard className="h-5 w-5 text-[var(--color-brass)]" />
          <div><p className="text-sm font-bold">Mock Card — Test Success</p><p className="text-xs text-[var(--color-warm-muted)]">Always succeeds (demo)</p></div>
        </button>
        <button onClick={() => setSelected("mock-decline")} className={cn("w-full text-left px-4 py-3 rounded-lg border transition flex items-center gap-3", selected === "mock-decline" ? "border-[var(--color-destructive)] bg-[var(--color-destructive)]/5" : "border-[var(--color-border)] hover:border-[var(--color-brass)]")}>
          <CreditCard className="h-5 w-5 text-[var(--color-destructive)]" />
          <div><p className="text-sm font-bold">Mock Card — Decline</p><p className="text-xs text-[var(--color-warm-muted)]">Simulates declined payment</p></div>
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--color-warm-muted)]"><ShieldCheck className="h-3.5 w-3.5" /> Secure mock payment — no real card data entered</div>
    </div>
  );
}

export function ShippingStep() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-[var(--color-foreground)]">Shipping</h2>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-v2 space-y-3">
        <label className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--color-ink-navy)]/5 border border-[var(--color-brass)]">
          <input type="radio" name="shipping" defaultChecked className="accent-[var(--color-brass)]" />
          <div><p className="text-sm font-bold">Standard — Free</p><p className="text-xs text-[var(--color-warm-muted)]">5-7 business days</p></div>
        </label>
        <label className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-brass)]">
          <input type="radio" name="shipping" className="accent-[var(--color-brass)]" />
          <div><p className="text-sm font-bold">Express — $6.99</p><p className="text-xs text-[var(--color-warm-muted)]">2-3 business days</p></div>
        </label>
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--color-warm-muted)]"><Truck className="h-3.5 w-3.5" /> Tracking provided at fulfillment</div>
    </div>
  );
}
