/**
 * PhotoBlock — gradient image placeholder (V2 Premium).
 *
 * Renders a rich, multi-stop linear gradient that serves as a warm
 * editorial photo-placeholder. Each category maps to a distinct
 * saturated palette — Bronze, Indigo, Burgundy, Emerald, Rust —
 * so PhotoBlock cards never look flat or washed-out.
 *
 * Consumers:
 *   - StorefrontHeader (favicon-style use in wordmark)
 *   - StorefrontFooter
 *   - Future: PDP gallery, category hero, vendor profile cards
 *
 * Tokens: all colors reference var(--color-*) tokens where defined;
 * inline HSL triples are used for gradient stops that don't need a
 * token alias.
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

/* Each entry is a 3-stop [start, mid, end] HSL triple for a
   linear-gradient. Stops are chosen for richness and distinctiveness
   — never washed-out past L=80%. */
const GRADIENTS: Record<PhotoBlockCategory, [string, string, string]> = {
  /* Warm ivory cream — the editorial default */
  neutral:     ["38 43% 91%",  "36 35% 80%",  "30 25% 68%"],

  /* Rich cobalt / indigo — premium electronics */
  electronics: ["220 45% 28%", "235 40% 42%", "250 35% 55%"],

  /* Burnished bronze / terracotta — artisan apparel */
  apparel:     ["22  55% 44%", "28  58% 56%", "18  48% 66%"],

  /* Deep forest / emerald — home & living */
  home:        ["140 32% 28%", "125 28% 42%", "115 22% 55%"],

  /* Rich spruce / teal — outdoors & garden */
  outdoors:    ["170 38% 30%", "155 32% 44%", "145 25% 58%"],

  /* Golden amber / wheat — grocery & pantry */
  grocery:     ["38  80% 50%", "42  72% 62%", "45  65% 74%"],

  /* Dusty rose / burgundy — beauty & cosmetics */
  beauty:      ["345 38% 52%", "338 32% 65%", "330 28% 78%"],

  /* Deep violet / indigo — books & media */
  books:       ["265 35% 38%", "275 30% 52%", "285 25% 66%"],
};

export function PhotoBlock({
  category = "neutral",
  className,
  label,
  watermark = true,
  accent = false,
  square = true,
}: PhotoBlockProps) {
  const [start, mid, end] = GRADIENTS[category];
  const bg: React.CSSProperties = {
    backgroundImage: `linear-gradient(135deg, hsl(${start}) 0%, hsl(${mid}) 50%, hsl(${end}) 100%)`,
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
            "text-white/55",
            "select-none pointer-events-none leading-none"
          )}
        >
          ◆
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
