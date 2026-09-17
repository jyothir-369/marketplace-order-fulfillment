/**
 * Review list — Phase 12 (reviews + ratings).
 */
"use client";

import { Star, ThumbsUp } from "lucide-react";
import { ComingSoon } from "@/components/ui/coming-soon";

export function ReviewList() {
  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl font-bold text-[var(--color-foreground)]">Customer Reviews</h3>
      <ComingSoon note="Reviews are not live yet — backend coverage (Review entity + endpoints) is deferred. The entries below are sample/demo data." />
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-v2 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--color-ink-navy)] to-[var(--color-navy-deep)] text-white flex items-center justify-center font-display text-sm font-bold">JD</div>
          <div><p className="text-sm font-bold">Jordan D.</p><p className="text-xs text-[var(--color-warm-muted)]">Verified Purchase · 5 stars</p></div>
        </div>
        <p className="text-sm text-[var(--color-foreground)] leading-relaxed">Excellent build quality and fast dispatch. Would recommend to anyone in the workshop.</p>
        <div className="flex items-center gap-2"><button className="text-xs font-semibold text-[var(--color-warm-muted)] hover:text-[var(--color-ink-navy)] flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> Helpful</button></div>
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-v2 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--color-ink-navy)] to-[var(--color-navy-deep)] text-white flex items-center justify-center font-display text-sm font-bold">AL</div>
          <div><p className="text-sm font-bold">A. Lee</p><p className="text-xs text-[var(--color-warm-muted)]">Verified Purchase · 4 stars</p></div>
        </div>
        <p className="text-sm text-[var(--color-foreground)] leading-relaxed">Good value, packaging could be improved but product performs as advertised.</p>
      </div>
      <div className="text-xs text-center text-[var(--color-warm-muted)]">More reviews will appear as orders complete and buyers leave feedback (Phase 12).</div>
    </div>
  );
}
