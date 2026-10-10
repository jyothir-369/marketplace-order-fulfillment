/**
 * Review list — Phase 12 (real API integration).
 */
"use client";

import { Star, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { getReviews } from "@/lib/api";
import type { ReviewDto, ReviewListResponse } from "@/lib/types";

export function ReviewList({ productId }: { productId: string }) {
  const [data, setData] = useState<ReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getReviews(productId)
      .then((res) => { if (mounted) { setData(res); setError(null); } })
      .catch((err: any) => { if (mounted) setError(err?.message ?? "Failed to load reviews"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [productId]);

  if (loading) return <div className="text-sm text-[var(--color-warm-muted)]">Loading reviews...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!data || data.reviews.length === 0) {
    return <div className="text-sm text-[var(--color-warm-muted)]">No reviews yet. Be the first to share your experience.</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl font-bold text-[var(--color-foreground)]">Customer Reviews</h3>
      <div className="flex items-center gap-3 text-sm text-[var(--color-warm-muted)]">
        <span className="font-bold text-[var(--color-ink-navy)] text-base">{data.averageRating.toFixed(1)}</span>
        <span>· {data.totalReviews} review{data.totalReviews !== 1 ? "s" : ""}</span>
      </div>
      {data.reviews.map((r: ReviewDto) => (
        <div key={r.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-v2 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--color-ink-navy)] to-[var(--color-navy-deep)] text-white flex items-center justify-center font-display text-sm font-bold">
              {(r.buyerName ?? "B").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold">{r.buyerName ?? "Buyer"}</p>
              <p className="text-xs text-[var(--color-warm-muted)]">Verified Purchase · {r.rating} stars</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "text-[var(--color-brass)] fill-current" : "text-[var(--color-warm-subtle)]"}`} />
            ))}
          </div>
          <p className="text-sm text-[var(--color-foreground)] leading-relaxed">{r.comment ?? "No comment provided."}</p>
          <div className="flex items-center gap-2">
            <button className="text-xs font-semibold text-[var(--color-warm-muted)] hover:text-[var(--color-ink-navy)] flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" /> Helpful
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
