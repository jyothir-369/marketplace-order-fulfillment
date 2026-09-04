# Marketplace UI Design Brief — For Implementation by Coding Agent

**How to use this document:** This is a *design brief*, not a locked architecture. Nothing here is final. I'm handing you (the implementing agent) the product vision, the UX problems to solve, and my strongest opinions on direction — but the concrete decisions (exact schema shape, exact component boundaries, exact libraries, exact file layout) are yours to make as you read the actual codebase. Where I've sketched code or wireframes, treat them as *intent*, not as a diff to paste in. If you find a better way to hit the same UX goal, take it. Where I flag an open question, resolve it yourself based on what you find in the repo, and note the decision you made and why.

Your job: read this, read the current frontend and backend code, and produce an implementation plan and then the implementation — using your own judgment on structure, naming, and technical approach.

---

## 1. The problem, in one sentence

The current build is a single unstyled catalog page stuck on "Failed to fetch" — it does not yet read as a marketplace at all: no home page, no categories, no vendor browsing, one nav tab, no visual identity. Everything else (checkout, order tracking, admin console, vendor portal) needs to hang off a real storefront shell that doesn't exist yet.

## 2. What "good" looks like — grounding, not gospel

I looked at how production marketplaces and dashboard products typically structure navigation before writing this brief. Some patterns worth weighing as you design, not blindly copying:

- Category trees at marketplace scale tend to outgrow a flat horizontal nav — fine for ~6-8 top items, but mega-menus or a left-nav pattern are what most sites reach for once subcategories exist. Decide which fits once you see how many categories the seed data implies.
- A "Deals" or equivalent discount surface earning its own nav slot (rather than being a buried filter) is a consistent pattern worth considering — but only if there's real discount/promotion data behind it. Don't fake it with a UI that has nothing real to show.
- Multi-vendor carts need to read as *one* transaction even when they span sellers — grouped subtotals, one checkout, one confirmation. This is already implied by the PRD's FR4-FR6; make sure the UI doesn't accidentally make a multi-vendor order feel like N separate purchases.
- Dashboard-style surfaces (vendor portal, admin console) generally scale better with a persistent sidebar than with top tabs, especially once you're past 4-5 sections — which this product already is once dead-letter, audit logs, vendor management, and category management all exist. Worth confirming this feels right once you see how many sections actually land.
- Empty states are a chance to orient a first-time user, not a dead end — especially relevant here since the current build's only visible state *is* an empty/broken one.

Use these as informed defaults, not requirements — if you see something in the codebase or seed data that argues for a different pattern, follow that instead.

## 3. Product surfaces this needs (the "what pages exist" question)

I don't want to hand you a locked route table — figure out the exact paths and file structure that fit the Next.js version and conventions already in the repo. But conceptually, a real version of this product needs three audiences to each have a coherent, complete set of screens:

**Buyer storefront** — the thing needs an actual front door. Right now `/products` (or whatever the catalog route is) is *also* the landing page, which is why it feels like a database viewer instead of a shop. Consider:
- A real home/landing experience — something merchandised: a hero moment, a way to browse by category, some kind of "featured" or "trending" surface, a way to discover vendors. Doesn't have to be all of these — use judgment on what the seed data can actually support believably.
- A way to browse *by category* — this probably means category needs to exist as real data first (see §4).
- A way to browse *by vendor* — this is a multi-vendor marketplace; right now there's no way for a buyer to even tell it's multi-vendor. A vendor directory and per-vendor storefront page would fix that, and it's cheap since it's mostly the existing catalog grid filtered differently.
- Order history for a returning buyer, not just a single order's confirmation page.
- The existing checkout → order confirmation flow, kept intact — that's already been thought through in prior work, don't re-litigate it, just make sure it plugs into the new shell coherently.

**Vendor portal** — currently (per earlier audit) just a flat inventory table with no orientation. Consider whether it needs its own small dashboard/landing (KPIs, pending fulfillment count, dead-letter count) before dropping a vendor straight into a raw table. Also consider whether vendors need any way to present themselves (a store profile) if buyers can now browse by vendor — those two need to connect.

**Admin console** — needs to be able to manage the things this brief introduces (categories, vendors as entities) in addition to what already exists (orders, dead-letter, audit logs).

Don't feel bound to exactly this page list — if you find a cleaner way to group these concerns (e.g., merging two screens, or realizing a "dashboard" landing isn't worth it for the vendor portal given the actual data available), make that call and document why.

## 4. The category problem — this needs your judgment

Categories don't exist as data right now — products only have a vendor. This is probably the single highest-leverage gap, since almost every "look like a real marketplace" fix (nav, home page, browse-by-category, filters) depends on it existing.

Things to figure out as you implement, not things I'm prescribing:
- Whether this is a new `categories` table with a parent/child relationship, or something simpler (a flat enum/tag on product) — depends on how much taxonomy depth is actually worth supporting given the size of the seed catalog. Don't over-build a two-level taxonomy for a catalog of 12 products.
- How existing products get categorized retroactively — could be a migration script with keyword-based assignment, could be a manual admin pass, could be seed-data-only for now with a real assignment flow deferred. Your call based on what's pragmatic.
- Whether this needs new backend endpoints or can be inferred/derived client-side initially as a stopgap while the real backend piece is built. If you're implementing both frontend and backend, sequence it however makes sense; if backend is out of scope for you right now, flag clearly what you assumed/stubbed so it's not silently wrong.

## 5. Fix the actual bug, not just the design

The screenshot behind this brief shows "Failed to fetch" *and* "0 products available" rendered at the same time with confidence — that's a real bug, not a design gap. Before any visual work, trace why the catalog fetch is failing (wrong API base URL, CORS, backend not running, wrong endpoint path — audit whichever it is) and make sure the UI can actually tell the difference between "the request errored" and "the request succeeded and returned nothing." Those need visibly different treatments; right now they're indistinguishable.

## 6. Visual direction — opinions, not a spec

The existing token system (light/dark, storefront vs. operational density, status-badge vocabulary) sounded solid from what I've seen described — I'd keep that foundation rather than reinventing colors/tokens. My opinions on direction, for you to weigh against what you find already built:

- Storefront should feel like a place to browse, not a table — generous imagery/color, real visual hierarchy between a hero moment and the grid, motion where it earns its keep (cart drawer, hover states), not everywhere.
- Operational surfaces (vendor/admin) should feel dense, fast-scanning, numeric — status color doing most of the communication work, minimal decoration.
- Don't let the two visual languages bleed into each other — a buyer should never see a correlation ID or a job-retry-count; an admin screen shouldn't have glassmorphic cards and gradient heroes.
- Favor real content states (loading, error, empty, populated) over static mockup imagery — this product's whole value proposition is correctness under real async conditions (per the PRD's concurrency/reconciliation focus), so the UI should feel confident and specific about state, not vague.

If you land on a materially different visual direction after actually looking at the code and seed data, that's fine — this is guidance for your judgment, not a brand guideline to enforce literally.

## 7. What I want back from you

Not "implement this exact document." I want you to:
1. Read the current frontend/backend code and the seed data.
2. Form your own point of view on the concrete page list, category data model, and component boundaries, using this brief as the problem statement and directional opinion — not as a spec to transcribe.
3. Flag anywhere you're making an assumption or deferring something (e.g., "categories are seed-data-only for now, no admin CRUD yet") so it's visible, not silent.
4. Actually implement it — this brief is the "why" and the "what problem", you own the "how."

If something in this brief conflicts with what you find in the real codebase (a component that already exists and does this differently, a data shape that doesn't support what I described), trust the codebase and adapt the idea rather than forcing my description to fit.
