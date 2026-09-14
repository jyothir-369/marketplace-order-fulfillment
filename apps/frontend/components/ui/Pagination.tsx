/**
 * Pagination — Previous / Next page controls with page indicator.
 *
 * Stateless: the parent owns the current page and passes `onPageChange`.
 * Disabled states are derived from `page` and `totalPages`.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex items-center justify-center gap-2 pt-6",
        className,
      )}
    >
      <button
        type="button"
        disabled={!hasPrev}
        onClick={() => onPageChange(page - 1)}
        className={cn(
          "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold",
          "border border-[var(--color-warm-border)] bg-[var(--color-card)]",
          "transition-colors",
          hasPrev
            ? "text-[var(--color-foreground)] hover:bg-[var(--color-cream)]"
            : "text-[var(--color-warm-muted)] opacity-50 cursor-not-allowed",
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        Prev
      </button>

      <span className="text-xs font-medium text-[var(--color-warm-muted)] tabular-nums px-2">
        Page <strong className="text-[var(--color-foreground)]">{page}</strong>{" "}
        of <strong className="text-[var(--color-foreground)]">{totalPages}</strong>
      </span>

      <button
        type="button"
        disabled={!hasNext}
        onClick={() => onPageChange(page + 1)}
        className={cn(
          "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold",
          "border border-[var(--color-warm-border)] bg-[var(--color-card)]",
          "transition-colors",
          hasNext
            ? "text-[var(--color-foreground)] hover:bg-[var(--color-cream)]"
            : "text-[var(--color-warm-muted)] opacity-50 cursor-not-allowed",
        )}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </nav>
  );
}
