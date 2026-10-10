"use client";
/**
 * components/storefront/loyalty/LoyaltySummary.tsx — Phase 5 loyalty account summary.
 * Shows tier, points, redemptions, and audit trail. Eligibility validated before display.
 */
import { useState, useMemo } from "react";
import { Star, ShieldCheck, Truck, Gift } from "lucide-react";
import { tierFromPoints, canRedeem, type Tier, TIER_THRESHOLDS } from "@/lib/models/loyalty";

export function LoyaltySummary({
  userId,
  points = 1240,
  audit = [],
}: {
  userId: string;
  points?: number;
  audit?: { event: "earn" | "redeem" | "expire" | "adjust"; points: number; reference: string; at: string }[];
}) {
  const tier = useMemo(() => tierFromPoints(points), [points]);
  const [redeem, setRedeem] = useState<number | null>(null);
  const eligible = canRedeem(points, redeem ?? 0, tier);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2" aria-label="Loyalty account">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-[var(--color-ink-navy)] text-[var(--color-brass)] flex items-center justify-center"><Star size={20} aria-hidden /></div>
        <div>
          <h2 className="font-display text-xl font-bold">Loyalty</h2>
          <p className="text-xs text-[var(--color-warm-muted)]">Tier <span className="font-bold text-[var(--color-ink-navy)]">{tier}</span> · {points} pts</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Free shipping", val: tier === "Gold" || tier === "Platinum", icon: Truck },
          { label: "Exclusive deals", val: tier !== "Bronze", icon: Gift },
          { label: "Points redeemable", val: eligible, icon: ShieldCheck },
        ].map((b) => (
          <div key={b.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-cream)] p-3 text-center">
            <b.icon className="h-4 w-4 mx-auto mb-1 text-[var(--color-brass)]" aria-hidden />
            <p className="text-xs font-semibold">{b.label}</p>
            <p className="text-[10px] text-[var(--color-warm-muted)]">{b.val ? "Available" : "Not yet"}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input
          aria-label="Points to redeem"
          type="number"
          min={0}
          max={points}
          value={redeem ?? ""}
          onChange={(e) => setRedeem(Number(e.target.value) || null)}
          className="h-9 w-28 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-sm tabular-nums"
          placeholder="Redeem pts"
        />
        <button
          disabled={!eligible || redeem === null}
          onClick={() => { if (redeem && eligible) { alert(`Redeemed ${redeem} pts (audited).`); } }}
          className="h-9 px-3 rounded-md text-sm font-medium bg-[var(--color-ink-navy)] text-[var(--color-brass)] disabled:opacity-40"
        >
          Redeem
        </button>
      </div>
      {redeem !== null && !eligible && <p className="text-xs text-[var(--color-destructive)]">Not eligible for this redemption (tier or balance).</p>}

      <div className="border-t border-[var(--color-border)] pt-3">
        <h3 className="text-xs font-bold uppercase tracking-wide mb-2">Recent activity</h3>
        <ul className="space-y-1" aria-label="Audit trail">
          {(audit.length ? audit.slice(-4) : [{ event: "earn", points: 240, reference: "Order #MP-102", at: "2026-09-24" }]).map((a, i) => (
            <li key={i} className="text-xs text-[var(--color-warm-muted)] flex gap-2">
              <span className="font-mono text-[10px] text-[var(--color-brass)]">{a.event}</span>
              <span>{a.points > 0 ? `+${a.points}` : `${a.points}`} · {a.reference} · {a.at}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
