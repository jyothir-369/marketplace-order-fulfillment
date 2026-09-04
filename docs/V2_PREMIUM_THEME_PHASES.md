# Marketplace V2 Premium Theming — Phased Implementation Plan

**Source design:** `marketplace_figma_v2_premium/` (5 SVG boards + direction notes)
**Target codebase:** `apps/frontend/` (Next.js 16, Tailwind v4, React 19, Radix UI, lucide-react)
**Backend integration contract:** Unchanged (NestJS `/api` surface stays the same)
**Basis:** `frontend-architecture-spec.md` + `MARKETPLACE_UI_CONTEXT.md`

---

## 0. What V2 Premium actually changes (so phases are sized correctly)

V2 is **not** a new layout. Layouts (route trees, route groups, density modes, polling, role gating, error boundaries, status-badge vocabulary) are already correct per the architecture spec and existing code. V2 is a **re-skin of the visual system** onto the existing layout grid:

| Layer | V1 (current) | V2 Premium (target) |
|---|---|---|
| Palette | Cool zinc grays + indigo primary | **Ink navy** (`#16233f`) + **brass/gold** accent (`#a9803f`) on **warm ivory** (`#faf7f1`) |
| Type | Inter everywhere | **Playfair Display** (serif) for display/headlines + **Inter** for UI/body |
| Imagery | Flat `#f4f4f5` boxes with hex glyph | Soft gradient "photo" blocks |
| Borders | Cool gray hairlines | Warm gray hairlines (`#e7e0d2`) |
| Elevation | Small soft shadows | Larger, softer shadows |
| Voice | Functional copy | Editorial, conversion-oriented storefront copy |
| Operational chrome | Indigo-accent sidebar | **Navy** sidebar + **gold rail** on KPI cards + live audit stream panel |

> **Critical constraint:** The architecture spec defines a *status-badge vocabulary* that is semantic — colors map to `Order.status`, `LineItem.fulfillmentStatus`, `VendorSyncJob.status`. V2 brass replaces the indigo `--color-primary` for the *brand* accent; it **must not** be wired into status semantics. Status tokens stay semantic (success/warn/danger/info); only the *brand accent* flips.

---

## 1. How many phases — and why

V2 is a **full re-skin** (palette, type, imagery, borders, elevation, sidebar chrome). However, to keep each iteration **reviewable**, **low-risk**, and **easy to revert**, I'm splitting it into **6 phases**, each shipping a coherent subset that can be visually evaluated end-to-end before the next starts.

The phasing order is determined by **blast radius / dependency**, not screen order:
1. Tokens first — every later phase consumes these tokens.
2. Storefront shell second — validates the direction at full quality.
3. Storefront catalog & product detail — conversion surfaces.
4. Storefront support screens — same layout, same tokens.
5. Operational chrome — flips to navy + gold rail.
6. Voice + imagery + polish — editorial copy and gradient photo blocks.

Each phase ends in a state where the app **still compiles, still type-checks, and still functions**.

---

## 2. The 6 Phases

### Phase 1 — Design Tokens & Typography Foundation
**Goal:** Wire V2 palette + typography into the design system. Zero visible UI changes for end users yet.

**Scope:**
- `apps/frontend/app/globals.css`
  - Add V2 palette tokens to `@theme`: `--color-ink-navy`, `--color-brass`, `--color-ivory`, `--color-warm-border`, `--color-forest`, `--color-clay`, `--color-warm-text`, `--color-warm-text-muted`.
  - Repoint `--color-background` → ivory (`#faf7f1`), `--color-foreground` → ink (`#1b1b18`), `--color-primary` → ink-navy (`#16233f`), `--color-primary-foreground` → ivory.
  - Keep semantic status colors (`--color-status-*`) untouched.
  - Add `--font-display` (Playfair Display) + `--font-sans` (Inter) font-family tokens.
- `apps/frontend/app/layout.tsx` — Wire `next/font/google` for Playfair Display + Inter.
- New `apps/frontend/lib/theme.ts` — Re-export token names, provide TS constants.

**Files touched:** ~5
**Risk:** Low (CSS-only first cut)
**Definition of done:** `npx tsc --noEmit` passes; homepage shows ivory bg + Playfair wordmark.
**Output commit:** `Phase 1: V2 palette + typography tokens`

---

### Phase 2 — Storefront Shell (Layout, Header, Footer)
**Goal:** Rebuild the buyer-facing shell — validates V2 on highest-visibility surface.

**Scope:**
- `components/storefront/StorefrontHeader.tsx`
  - Replace indigo icon + Inter wordmark with **Playfair Display** "Marketplace" wordmark + brass dot glyph.
  - Add gold active-nav rule under active link.
  - Switch search input border to warm gray.
  - Cart count badge: brass pill (not info-blue).
- `app/(storefront)/layout.tsx` — Editorial subheader strip, warm-cream glass effect.
- New `components/storefront/StorefrontFooter.tsx` — 3-column links, brand wordmark.
- New `components/ui/PhotoBlock.tsx` — Soft-gradient photo placeholder (replaces hex-icon placeholders).
- Update nav items: `Home` / `Shop` / `Deals` / `Vendors`.

**Files touched:** ~6
**Risk:** Medium (public surface)
**Definition of done:** All storefront routes render new shell; `/products` still works.
**Output commit:** `Phase 2: Storefront shell re-skin`

---

### Phase 3 — Storefront Catalog & Product Detail
**Goal:** The two conversion surfaces — `app/(storefront)/products/page.tsx` and `products/[id]/page.tsx`.

**Scope:**
- `app/(storefront)/products/page.tsx`
  - Editorial section eyebrow ("SHOP THE FULL CATALOG"), serif H1, Inter meta.
  - Category chips: pill-shaped, navy active, ivory inactive, warm-gray border.
- `components/storefront/CatalogGrid.tsx` — Photo-block tiles, vendor eyebrow + serif product name + price + add-to-cart.
- `app/(storefront)/products/[id]/page.tsx` — Serif H1, brass "Ships from" callout, purchase panel with brass CTA.
- `components/storefront/ProductCard.tsx` — PhotoBlock image, stock badge (forest/clay).
- `components/storefront/VendorCard.tsx` — Brass vendor-name rule; serif vendor name.

**Files touched:** ~8
**Risk:** Medium (conversion surfaces)
**Definition of done:** Catalog + PDP V2 at full quality; add-to-cart flow unaffected.
**Output commit:** `Phase 3: Catalog & PDP V2 re-skin`

---

### Phase 4 — Storefront Support Screens (Cart, Checkout, Orders, Vendors)
**Goal:** Apply V2 skin to remaining storefront routes.

**Scope:**
- `app/(storefront)/checkout/page.tsx` + `CheckoutForm.tsx` — Editorial stepper, brass active step.
- `app/(storefront)/orders/page.tsx` + `[id]/page.tsx` — Serif page title; status badges untouched (semantic).
- `app/(storefront)/vendors/page.tsx` + `[id]/page.tsx` — Editorial "Vendors on Marketplace" hero.
- `components/storefront/CartDrawer.tsx` — Ivory bg, hairline border, brass checkout CTA.

**Files touched:** ~10
**Risk:** Medium-High (flows must not break)
**Definition of done:** All storefront routes consistently V2-skinned; cart-to-order flow works end-to-end.
**Output commit:** `Phase 4: Storefront support screens V2`

---

### Phase 5 — Operational Chrome (Sidebars, KPI Cards, Audit Stream)
**Goal:** Flip `/admin/*` and `/vendor/*` from indigo-accent to navy + gold rail.

**Scope:**
- `app/(operational)/admin/layout.tsx` + `components/operations/AdminSidebar.tsx`
  - Background `#0e1830`, wordmark in cream, gold underline on brand rule.
  - Active nav: navy-elevated fill (`#1f2f52`) + **3px brass left rail**.
  - Section labels in gold (`#d9c08f`).
- `app/(operational)/vendor/layout.tsx` + `components/operations/VendorSidebar.tsx` — Same treatment.
- `components/operations/KpiCard.tsx` — White card on warm bg, **3px brass left rail**, serif KPI numeral.
- `components/admin/AuditLogMarquee.tsx` — Navy bg, cream text, event dots stay semantic.
- `components/order/{InventoryTable,PollingStatus,NetworkStatus}.tsx` — Warm hairline borders.

**Files touched:** ~8
**Risk:** Medium (density must hold)
**Definition of done:** Admin/vendor sidebars navy + brass rail; status badges semantic inside tables.
**Output commit:** `Phase 5: Operational chrome navy + brass`

---

### Phase 6 — Voice, Imagery & Polish Pass
**Goal:** Layer editorial copy and gradient photo-blocks across the storefront; polish skeletons, shadows, spacing.

**Scope:**
- Editorial copy pass:
  - New `/products` landing page ("Shop from vendors you can trust" hero).
  - Empty states, error states, toast messages — editorial, not generic.
- `components/ui/PhotoBlock.tsx` polish — Per-category gradient palettes, serif watermark glyph.
- `components/ui/skeleton.tsx` — Warm-toned shimmer (not cool-gray).
- Elevation pass — Increase shadows to V2 values across cards, buttons, dialogs.
- `data-testid` + aria-label review on every changed component.
- `prefers-reduced-motion` still respected.

**Files touched:** ~12
**Risk:** Low (additive)
**Definition of done:** No leftover lorem ipsum; warm-toned skeletons; reduced-motion respected; WCAG AA contrast maintained.
**Output commit:** `Phase 6: Voice + imagery + polish pass`

---

## 3. Cross-phase invariants (never violate)

1. `tsc --noEmit` exits 0 at every phase boundary.
2. No `// @ts-ignore` added — fix the type instead.
3. Status-badge semantics intact — brass is brand-only, never a status color.
4. Density modes preserved — `data-density` attributes keep their row-height rules.
5. No inline hex in JSX — every color routes through `var(--color-*)` or a Tailwind class backed by a token.
6. Each phase leaves the app in a runnable, demoable state.
7. Backend contract unchanged.
8. WCAG AA contrast maintained for ink-navy on ivory.

---

## 4. Effort summary

| Phase | Scope | Files (est.) | Risk |
|---|---|---|---|
| 1. Tokens & Type | globals.css, layout.tsx, lib/theme.ts | ~5 | Low |
| 2. Storefront shell | Header, layout, footer, PhotoBlock | ~6 | Medium |
| 3. Catalog & PDP | Catalog page, PDP, ProductCard, CatalogGrid | ~8 | Medium |
| 4. Support screens | Cart, checkout, orders, vendors | ~10 | Medium-High |
| 5. Operational chrome | Admin/vendor sidebars, KPI cards, audit | ~8 | Medium |
| 6. Voice & polish | Copy, PhotoBlock, skeletons, shadows | ~12 | Low |

**Total: 6 phases, ~50 file touches, ~10–13 review sittings.**

---

## 5. Recommended starting point

Start with **Phase 1 immediately** — it's low-risk, validates the direction in minutes, and unblocks every later phase. Phases 2–5 can then be done in order, or run in parallel across two streams (storefront vs. operational) if review bandwidth allows. Phase 6 should be last.

---

## 6. Deliberately excluded from this plan

- New screens (V2 is a re-skin of existing layouts only).
- Backend changes (DTOs, endpoints, status enums stay).
- New dependencies (Playfair Display + Inter via `next/font/google` only).
- Redesign of the status-badge vocabulary (semantic infrastructure, not chrome).
- Dark-mode rework (V2 is a single-theme direction; existing `[data-theme="dark"]` stays as-is).
