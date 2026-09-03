/**
 * InventoryLockIndicator — stock-state indicator for PDP and catalog cards (§2.2, §4.2).
 *
 * Shows:
 *   - In Stock    : green dot + stock count
 *   - Low Stock   : amber pulsing dot + count ("only N left")
 *   - Out of Stock: red dot + "Out of Stock"
 *
 * The pulsing dot uses the single class `animate-pulse` (not a wrapper class)
 * per §1.2 spec.
 */

"use client";

interface InventoryLockIndicatorProps {
  stockCount: number;
  /** Hide the numeric count and show just the status label. */
  compact?: boolean;
  className?: string;
}

export function InventoryLockIndicator({
  stockCount,
  compact = false,
  className = "",
}: InventoryLockIndicatorProps) {
  if (stockCount === 0) {
    return (
      <span
        className={["inline-flex items-center gap-1.5 text-xs font-semibold", className].join(" ")}
        aria-label="Out of stock"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
        <span className="text-red-700">Out of Stock</span>
      </span>
    );
  }

  if (stockCount <= 10) {
    return (
      <span
        className={["inline-flex items-center gap-1.5 text-xs font-semibold", className].join(" ")}
        aria-label={`Low stock — only ${stockCount} left`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden />
        <span className="text-amber-700">
          {compact ? "Low stock" : `Only ${stockCount} left`}
        </span>
      </span>
    );
  }

  return (
    <span
      className={["inline-flex items-center gap-1.5 text-xs font-semibold", className].join(" ")}
      aria-label={`In stock — ${stockCount} available`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
      <span className="text-emerald-700">
        {compact ? "In stock" : `${stockCount} in stock`}
      </span>
    </span>
  );
}
