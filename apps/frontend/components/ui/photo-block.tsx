/**
 * PhotoBlock — soft-gradient image placeholder (V2 Premium).
 *
 * Replaces the flat gray hex-icon placeholders used in v1. Renders a
 * warm gradient that suggests product photography without requiring a
 * real image. Includes a subtle brass-accented watermark glyph and
 * accepts an optional category to pick a fitting gradient palette.
 *
 * Consumers:
 *   - StorefrontHeader (favicon-style use in wordmark)
 *   - StorefrontFooter
 *   - Future: PDP gallery, category hero, vendor profile cards
 *
 * Tokens: pulls gradient stops from --color-ivory, --color-ivory-muted,
 * --color-cream, --color-forest, --color-clay via `v2Palette`. No
 * raw hex in the component.
 */

import { cn } from "@/lib/utils";

export type PhotoBlockCategory =
  | "neutral"
  | "electronics"
  | "apparel"
  | "home"
  | "outdoors"
  | "grocery"
  | "beauty"
  | "books";

interface PhotoBlockProps {
  /** Category palette preset. */
  category?: PhotoBlockCategory;
  /** Tailwind classes for the outer container (size, etc.). */
  className?: string;
  /** Optional label for accessibility (defaults to category). */
  label?: string;
  /** Show the subtle serif watermark glyph. Default true. */
  watermark?: boolean;
  /** Render with a brass corner accent (decorative). */
  accent?: boolean;
  /** Use a 1:1 ratio (default true). Set false for full-bleed / wide. */
  square?: boolean;
}

/* Each palette is a pair of HSL triples (start, end) feeding a linear
   gradient. Tones are warm-leaning and designed to read as a soft
   photographic wash, not a colored chip. */
const GRADIENTS: Record<PhotoBlockCategory, [string, string]> = {
  neutral:     ["38 43% 95%",  "30 28% 85%"],   /* ivory → warm taupe */
  electronics: ["220 18% 92%", "210 22% 78%"],   /* cool slate */
  apparel:     ["18 38% 92%",  "12 40% 82%"],    /* warm clay */
  home:        ["120 18% 92%", "90 22% 80%"],    /* sage / forest */
  outdoors:    ["160 22% 90%", "140 28% 75%"],   /* sea-green */
  grocery:     ["50 60% 92%",  "42 65% 80%"],    /* warm wheat */
  beauty:      ["340 30% 92%", "320 40% 82%"],   /* dusty rose */
  books:       ["260 18% 92%", "240 22% 80%"],   /* dusty indigo */
};

export function PhotoBlock({
  category = "neutral",
  className,
  label,
  watermark = true,
  accent = false,
  square = true,
}: PhotoBlockProps) {
  const [start, end] = GRADIENTS[category];
  const bg: React.CSSProperties = {
    backgroundImage: `linear-gradient(135deg, hsl(${start}) 0%, hsl(${end}) 100%)`,
  };

  const accessibleLabel = label ?? `${category} photo placeholder`;

  return (
    <div
      role="img"
      aria-label={accessibleLabel}
      className={cn(
        "relative overflow-hidden",
        square ? "aspect-square" : "aspect-[16/9]",
        "border border-[var(--color-warm-border)]",
        className
      )}
      style={bg}
    >
      {/* Subtle watermark glyph in serif italic — decorative */}
      {watermark && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "font-display text-[clamp(2.5rem,8cqw,5rem)]",
            "text-[var(--color-warm-foreground)] opacity-25",
            "select-none pointer-events-none leading-none"
          )}
        >
          &mdash;
        </span>
      )}

      {/* Brass corner accent — V2 brand cue */}
      {accent && (
        <span
          aria-hidden
          className={cn(
            "absolute top-0 left-0 h-1 w-10",
            "bg-[var(--color-accent)]"
          )}
        />
      )}
    </div>
  );
}

/**
 * Inline glyph used for header / footer brand mark. Uses serif italic
 * to signal "Marketplace" without a logo asset.
 */
export function BrandGlyph({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "font-display italic font-bold text-[var(--color-accent)]",
        className
      )}
    >
      M.
    </span>
  );
}