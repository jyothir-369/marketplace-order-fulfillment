/**
 * Review form — Phase 12 (real API integration).
 */
"use client";

import { Star, Send } from "lucide-react";
import { useState } from "react";
import { createReview } from "@/lib/api";

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await createReview({ productId, rating, comment: comment || undefined });
      setStatus("success");
      setComment("");
      setRating(5);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message ?? "Failed to submit review");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 space-y-4">
      <h3 className="font-display text-xl font-bold">Write a Review</h3>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRating(s)}
            aria-label={`${s} stars`}
            className={s <= rating ? "text-[var(--color-brass)]" : "text-[var(--color-warm-subtle)]"}
          >
            <Star className="h-5 w-5 fill-current" />
          </button>
        ))}
        <span className="text-xs text-[var(--color-warm-muted)] ml-2">{rating} stars</span>
      </div>
      <textarea
        rows={3}
        placeholder="Share your experience..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-brass)]"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="h-4 w-4" /> Submit Review
      </button>
      {status === "success" && <p className="text-sm text-green-600">Review submitted!</p>}
      {status === "error" && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
