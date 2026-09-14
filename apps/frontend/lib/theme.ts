/**
 * Theme — Phase 1 V2 Premium token catalogue
 *
 * Single TypeScript source-of-truth for V2 Premium token names so
 * components can import named constants instead of repeating the
 * raw `--color-*` strings. All colors here are HSL triples consumed
 * via Tailwind's `hsl(var(--token))` pipeline (or the CSS layer in
 * globals.css).
 *
 * IMPORTANT: Brand accent (`--color-accent` / brass) and the
 * semantic alert colors (`--color-success`, `--color-warning`,
 * `--color-destructive`, `--color-info`) are NOT interchangeable.
 * Brass is a brand decorative accent; semantic alerts are reserved
 * for status vocabulary (FULFILLED, FAILED, DEAD_LETTER, etc.).
 * The `StatusBadge` vocabulary in status-tokens.ts uses raw Tailwind
 * classes and is unaffected by these tokens.
 */

/* ----------------------------------------------------------------
 * V2 Premium palette — raw HSL triples
 * ---------------------------------------------------------------- */
export const v2Palette = {
  /* Surface */
  ivory:        "38 47% 96%",
  ivoryCard:    "38 43% 95%",
  cream:        "38 43% 91%",
  surfaceWarm:  "36 30% 94%",
  ivoryHover:   "36 24% 90%",
  ivoryMuted:   "36 20% 88%",

  /* Ink */
  inkNavy:      "220 33% 17%",
  navyDeep:     "220 45% 8%",
  warmInk:      "40 8% 11%",
  warmMuted:    "30 8% 44%",
  warmSubtle:   "30 8% 58%",

  /* Brand accent */
  brass:        "38 40% 55%",

  /* Editorial accents */
  forest:       "120 25% 35%",
  clay:         "12 40% 34%",

  /* Warm borders */
  warmBorder:        "36 24% 87%",
  warmBorderStrong: "34 20% 65%",
} as const;

/* ----------------------------------------------------------------
 * Semantic tokens (mapped to --color-* in globals.css)
 * ---------------------------------------------------------------- */
export const tokens = {
  background:            "--color-background",
  foreground:            "--color-foreground",
  card:                  "--color-card",
  cardForeground:              "--color-card-foreground",
  popover:               "--color-popover",
  popoverForeground:           "--color-popover-foreground",

  primary:               "--color-primary",
  primaryForeground:           "--color-primary-foreground",
  primaryHover:               "--color-primary-hover",

  secondary:             "--color-secondary",
  secondaryForeground:         "--color-secondary-foreground",
  muted:                 "--color-muted",
  mutedForeground:             "--color-muted-foreground",

  accent:                "--color-accent",
  accentForeground:            "--color-accent-foreground",

  destructive:           "--color-destructive",
  destructiveForeground:       "--color-destructive-foreground",
  success:               "--color-success",
  successForeground:           "--color-success-foreground",
  warning:               "--color-warning",
  warningForeground:           "--color-warning-foreground",
  info:                  "--color-info",
  infoForeground:              "--color-info-foreground",

  border:                "--color-border",
  input:                 "--color-input",
  ring:                  "--color-ring",

  ivory:                 "--color-ivory",
  ivoryCard:             "--color-ivory-card",
  cream:                 "--color-cream",
  brass:                 "--color-brass",
  inkNavy:               "--color-ink-navy",
  navyDeep:              "--color-navy-deep",
  forest:                "--color-forest",
  clay:                  "--color-clay",
  warmBorder:            "--color-warm-border",
  warmBorderStrong:       "--color-warm-border-strong",
  warmForeground:             "--color-warm-foreground",
  warmMuted:             "--color-warm-muted",
  warmSubtle:            "--color-warm-subtle",

  sidebarBg:             "--color-sidebar-bg",
  sidebarBorder:         "--color-sidebar-border",
  sidebarText:           "--color-sidebar-text",
  sidebarTextMuted:      "--color-sidebar-text-muted",
  sidebarActive:         "--color-sidebar-active",
  sidebarActiveBg:       "--color-sidebar-active-bg",
  sidebarHover:          "--color-sidebar-hover",
  sidebarBadge:          "--color-sidebar-badge",
  sidebarBadgeText:      "--color-sidebar-badge-text",
} as const;

export type TokenName = (typeof tokens)[keyof typeof tokens];

/* ----------------------------------------------------------------
 * Typography — font stack constants (mirror globals.css)
 *
 * Font tokens are set in globals.css as full CSS stacks:
 *   --font-sans:     Inter first, system fallbacks
 *   --font-display:  Playfair Display first, serif fallbacks
 *
 * When fonts are self-hosted (next/font/local or @font-face), only the
 * globals.css values need to change — every consumer uses `font-display`
 * / `font-sans` utility classes via Tailwind.
 * ---------------------------------------------------------------- */
export const fontStacks = {
  sans:    'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  display: '"Playfair Display", Georgia, "Times New Roman", serif',
} as const;

export const fontTokens = {
  sans:     "--font-sans",
  display:  "--font-display",
} as const;

/* ----------------------------------------------------------------
 * Hex constants — exported only for SVG / gradient generators.
 * Never use these directly in JSX className strings; route through
 * the Tailwind utility classes or var(--color-*) helpers instead.
 * ---------------------------------------------------------------- */
export const v2Hex = {
  ivory:        "#faf7f1",
  ivoryCard:    "#f5f0e8",
  cream:        "#f3ede0",
  surfaceWarm:  "#f1ede3",
  ivoryHover:   "#ebe5d6",
  ivoryMuted:   "#e2dbc9",

  inkNavy:      "#16233f",
  navyDeep:     "#0e1830",
  navyElevated: "#1f2f52",
  warmInk:      "#1b1b18",
  warmMuted:    "#71695c",
  warmSubtle:   "#948c7c",

  brass:        "#a9803f",
  brassDeep:    "#8a5a1f",
  brassLight:   "#d9c08f",

  forest:       "#2f5f42",
  forestLight:  "#e6efe4",
  clay:         "#8a3b2c",
  clayLight:    "#f6e5e1",

  warmBorder:        "#e7e0d2",
  warmBorderStrong: "#b8a990",
} as const;

/* ----------------------------------------------------------------
 * Editorial eyebrow copy patterns (used in V2 section headers)
 * ---------------------------------------------------------------- */
export const editorialEyebrows = {
  catalog:  "SHOP THE FULL CATALOG",
  deals:    "CURATED SAVINGS",
  product:  "PRODUCT DETAIL",
  cart:     "YOUR CART",
  checkout: "CHECKOUT",
  orders:   "YOUR ORDERS",
  vendors:  "VENDORS ON MARKETPLACE",
  admin:    "MARKETPLACE OPERATIONS",
  audit:    "LIVE AUDIT STREAM",
} as const;

export type EditorialEyebrow = keyof typeof editorialEyebrows;