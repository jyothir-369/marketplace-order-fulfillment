# Marketplace Navigation and UX Roadmap

## Purpose

This document converts the Marketplace vs. Amazon vs. Flipkart navigation comparison into an implementation-ready, phased roadmap. The goal is to improve discovery, reduce navigation effort, make primary actions easier to recognize, and give Marketplace a more complete e-commerce experience without introducing unrelated changes.

## 1. Current Marketplace Baseline

### 1.1 Existing storefront header

The current storefront header has three primary navigation tabs:

| Existing tab | Destination | Current purpose |
|---|---|---|
| Shop | `/products` | Browse all products |
| Vendors | `/vendors` | Browse vendors |
| Orders | `/orders` | View customer orders |

The header also contains:

- Global product and vendor search
- Account menu with Sign in and Create account
- Cart button with item count
- Responsive mobile navigation
- Announcement bar

**Current primary tab count: 3**

The main implementation file is `apps/frontend/components/storefront/StorefrontHeader.tsx`.

### 1.2 Existing storefront routes

The storefront currently contains these buyer-facing routes:

| Area | Existing routes |
|---|---|
| Home | `/` |
| Catalog | `/products`, `/products/[id]` |
| Vendors | `/vendors`, `/vendors/[vendorId]` |
| Deals | `/deals` |
| Checkout | `/checkout` |
| Orders | `/orders`, `/orders/[id]` |
| Account | `/account`, `/login`, `/register` |
| Engagement | `/wishlist`, `/notifications` |
| Information | `/about`, `/help` |

**Existing storefront route count: 16**

### 1.3 Existing operational routes

The admin and vendor portals contain these routes:

| Portal | Existing routes |
|---|---|
| Admin | `/dashboard`, `/orders`, `/orders/[id]`, `/products`, `/customers`, `/categories`, `/inventory`, `/reconciliation`, `/analytics`, `/audit-logs`, `/dead-letter`, `/health`, `/vendors` |
| Vendor | `/dashboard`, `/products`, `/inventory`, `/orders`, `/promotions`, `/settings`, `/analytics`, `/dead-letter` |

**Existing operational route count: 19**

### 1.4 Existing footer

The current footer has three columns:

| Column | Existing links |
|---|---|
| Shop | All products, Deals, Vendors |
| Your account | Orders, Checkout |
| Company | About, Help center |

**Existing footer link count: 7**

The main implementation file is `apps/frontend/components/storefront/StorefrontFooter.tsx`.

## 2. Competitive Benchmark

### 2.1 Flipkart

Flipkart's public storefront uses a category-first navigation model. Its desktop navigation includes approximately 14 primary tabs, including:

- For You
- Fashion
- Mobiles
- Electronics
- Beauty
- Home
- Appliances
- Toys, Baby & Kids
- Food & Health
- Auto Accessories
- Sports & Fitness
- Furniture
- Books
- 2 Wheelers

It also provides utility actions such as Cart, Login, Sign Up, My Profile, Orders, Wishlist, Rewards, Gift Cards, Customer Care, and a More menu.

### 2.2 Amazon

Amazon uses a broader desktop navigation model with approximately 10–12 primary links in its main shell, plus a utility bar. Its navigation commonly includes:

- All
- Departments
- Today's Deals
- Customer Service
- Registry
- Gift Cards
- Sell
- Amazon Business
- Prime-related actions
- Account, Lists, Cart, and Orders

Amazon's strongest navigation pattern is the department mega menu: users can browse a complete category tree without first opening a flat product listing.

### 2.3 Comparison matrix

| Dimension | Marketplace | Flipkart | Amazon |
|---|---:|---:|---:|
| Primary header tabs | 3 | 14 | Approximately 10–12 |
| Primary footer columns | 3 | 5 or more | 5 or more |
| Primary footer links | 7 | 25 or more | 30 or more |
| Category mega menu | No | Yes | Yes |
| Personalized entry point | No | For You | Account/recommendation-based |
| Persistent wishlist | No | Yes | Lists |
| Recently viewed | No | Yes | Yes |
| Business portal | No | No | Amazon Business |
| Loyalty program | No | Flipkart Plus | Prime |
| Live category counts | No | Yes | Yes |
| Advanced filtering | Limited | Yes | Yes |
| Responsive navigation | Partial | Yes | Yes |
| Support entry point | Help page only | Customer Care | Customer Service |

## 3. Main Findings

1. Marketplace has the smallest navigation surface in the comparison.
2. Existing pages such as Deals, Wishlist, Notifications, and Help are not prominent enough in the header.
3. Product discovery is mostly flat: users open `/products` and then filter or search.
4. Category navigation is not represented as a first-class header experience.
5. The footer contains useful links but does not yet cover vendor, seller, support, trust, and account-management journeys.
6. Marketplace already has a strong foundation in cart, order, vendor, admin, and operational flows.
7. The next improvement should prioritize existing routes before adding new features.

## 4. Implementation Principles

The roadmap follows these rules:

- Promote existing routes before creating new routes.
- Keep the desktop and mobile navigation consistent.
- Use category navigation to reduce the number of clicks needed to find products.
- Keep primary buyer actions visible: Search, Account, Wishlist, Cart, and Orders.
- Use progressive disclosure for secondary actions instead of crowding the header.
- Preserve keyboard navigation, visible focus states, ARIA labels, and screen-reader labels.
- Measure navigation success before and after each phase.
- Do not add loyalty, B2B, or AI features before the navigation foundation is stable.

# Phase 0 — Baseline, Information Architecture, and Design Sign-off

## Objective

Create a stable navigation inventory, agree on the final tab hierarchy, and prepare the design system before implementation.

## Work items

### 0.1 Finalize the navigation hierarchy

Recommended primary header structure:

| Position | Navigation item | Destination | Status |
|---|---|---|---|
| 1 | Shop | `/products` | Existing |
| 2 | Vendors | `/vendors` | Existing |
| 3 | Orders | `/orders` | Existing |
| 4 | Deals | `/deals` | Existing |
| 5 | Help | `/help` | Existing |

The first four items are the minimum Phase 1 structure. Help can be placed in a More/support menu if desktop space becomes constrained.

### 0.2 Define utility actions

Recommended persistent utility actions:

- Account or Sign in
- Wishlist
- Cart with count
- Orders shortcut when authenticated

### 0.3 Define footer columns

Recommended final footer structure:

| Column | Links |
|---|---|
| Shop | All products, Deals, Vendors, Categories |
| Your account | Orders, Account, Wishlist, Checkout |
| Sell | Become a vendor, Vendor dashboard, Vendor support |
| Company | About, Contact, Careers, Privacy |
| Support | Help center, FAQ, Returns, Delivery information |

### 0.4 Prepare design tokens

Create or document reusable visual tokens for:

- Primary navigation
- Active navigation
- Utility actions
- Mega-menu surface
- Badge counts
- Focus rings
- Mobile navigation
- Footer link states

## Phase 0 acceptance criteria

- All current routes are inventoried.
- The final header and footer hierarchy is approved.
- Existing and proposed routes are clearly distinguished.
- Responsive behavior is defined for desktop, tablet, and mobile.
- Accessibility requirements are defined.
- No production navigation code is changed until this phase is complete.

## Phase 0 deliverables

- `MARKETPLACE_NAVIGATION_PHASES.md`
- Navigation wireframes
- Final route inventory
- Design-token requirements
- Implementation backlog

# Phase 1 — Navigation Foundation and Existing-Page Promotion

## Objective

Make the Marketplace feel more complete immediately by promoting existing pages, adding category discovery, and improving the footer.

## 1.1 Expand the primary header

### Changes

Add Deals as a permanent primary tab:

- `Shop` → `/products`
- `Vendors` → `/vendors`
- `Orders` → `/orders`
- `Deals` → `/deals`

Keep Help accessible through a More or Support menu initially.

### Rationale

Deals is already implemented, so adding it to the header creates a high-impact navigation improvement with minimal new backend work.

### Acceptance criteria

- Deals is visible as a primary desktop tab.
- The active tab state works for `/deals`.
- Keyboard focus remains visible.
- The desktop layout does not overflow at the current maximum container width.
- Mobile navigation includes Deals.

## 1.2 Add a Shop mega menu

### Changes

The Shop tab opens a category discovery panel containing:

- Featured categories
- Category cards or links
- Current product counts where available
- A link to the full product catalog
- A secondary section for vendor or deal discovery when data is available

### Suggested interaction

- Desktop: open on hover or focus-within.
- Touch devices: open on click or tap.
- Keyboard users: open on focus and close with Escape.
- The menu must not trap focus or hide the underlying page.

### Acceptance criteria

- Users can reach major categories without first opening a flat listing.
- Category links use real routes or query parameters.
- Empty categories are handled gracefully.
- The mega menu works with search, account, and cart actions.
- The menu closes when focus leaves it or the page is navigated away.

## 1.3 Add category counts and filters

### Changes

Add category counts to the Shop mega menu and the products page.

Recommended product-page controls:

- Category filter
- Price range
- Availability
- Vendor
- Sort by popularity, price, newest, or rating when data is available

### Acceptance criteria

- Users can narrow the catalog without reloading the entire page unnecessarily.
- Filter state is represented in the URL where practical.
- Empty results have a clear recovery action.
- Reset filters is available.

## 1.4 Add Recently Viewed

### Changes

Add a Recently Viewed section to the home page and product page.

Recommended behavior:

- Store recently viewed product IDs in the browser.
- Show product cards with image, name, price, and vendor.
- Show a clear empty state when no history exists.
- Cap the stored history to a reasonable number such as 8–12 products.

### Acceptance criteria

- Recently viewed products appear after revisiting the home page.
- Removed or unavailable products are excluded or shown as unavailable.
- The section does not block product discovery.
- The feature works after page refresh.

## 1.5 Redesign the footer

### Changes

Expand the footer from three columns to the recommended five-column structure.

Add links to:

- Existing storefront pages
- Vendor onboarding and vendor dashboard
- Help center and support information
- Privacy, terms, and company information where available

### Acceptance criteria

- Existing links continue to work.
- The footer does not become visually crowded on mobile.
- The footer is semantically divided into navigation regions.
- Vendor-related links are separated from buyer support links.

## 1.6 Improve cart and wishlist visibility

### Changes

- Keep the Cart action prominent in the header.
- Add a persistent Wishlist action beside Cart.
- Use a visible count badge for cart items.
- Use a smaller, clearly differentiated badge or icon state for wishlist items when available.

### Acceptance criteria

- Cart and Wishlist are visually distinct.
- Cart count is readable at desktop and mobile sizes.
- Wishlist is reachable from the header without opening a nested menu.
- The actions have accessible names and focus states.

## Phase 1 acceptance summary

- Primary tabs increase from 3 to 4.
- The Shop tab becomes a category discovery entry point.
- Existing Deals, Wishlist, Notifications, and Help routes become easier to discover.
- Footer links increase from 3 columns to 5 columns.
- Product filtering and recently viewed discovery are available.
- Cart and Wishlist are visually distinct and accessible.

## Phase 1 implementation files

- `apps/frontend/components/storefront/StorefrontHeader.tsx`
- `apps/frontend/components/storefront/StorefrontFooter.tsx`
- `apps/frontend/app/(storefront)/page.tsx`
- `apps/frontend/app/(storefront)/products/page.tsx`
- `apps/frontend/components/storefront/CatalogGrid.tsx`
- `apps/frontend/context/CartStore.ts`
- Relevant category and product data files

# Phase 2 — Account, Cart, and Shopping Journey Improvements

## Objective

Reduce friction between browsing, account access, cart management, wishlist use, checkout, and order tracking.

## 2.1 Improve the account menu

### Changes

When authenticated, show quick links for:

- Account
- Orders
- Wishlist
- Notifications
- Sign out

Keep the avatar or account name as the main trigger.

### Acceptance criteria

- Authenticated users do not need to navigate through multiple pages to reach common account actions.
- Sign-out is clearly separated from navigation links.
- The menu remains usable on mobile.
- The menu closes on route changes and outside clicks.

## 2.2 Improve cart drawer navigation

### Changes

Add or improve:

- Quantity controls
- Remove and save-for-later actions
- Delivery estimates
- Cart subtotal
- Checkout CTA
- Empty-cart recovery link
- Related products or recommended items

### Acceptance criteria

- Users can complete the cart-to-checkout journey without returning to the catalog.
- Cart state remains consistent after refresh.
- Checkout is disabled or clearly explained when the cart is empty.
- Error states are shown when an item becomes unavailable.

## 2.3 Improve product detail navigation

### Changes

Add product-page navigation aids:

- Breadcrumbs
- Vendor link
- Category link
- Related products
- Recently viewed products
- Wishlist and add-to-cart actions
- Clear stock and delivery information

### Acceptance criteria

- Users can understand where a product belongs in the catalog.
- Users can return to the correct category after viewing a product.
- Product actions remain visible on mobile.
- Vendor and category links are accessible.

## 2.4 Improve order journey

### Changes

Add clear order states and actions:

- Order summary
- Delivery status
- Vendor information
- Tracking information where available
- Return or support actions
- Reorder action when appropriate

### Acceptance criteria

- Users can understand the current order state at a glance.
- Order status is visually distinct from generic text.
- Order details are readable on mobile.
- Support actions are available from the order page.

## 2.5 Improve notifications

### Changes

Make Notifications a persistent account or utility action and add:

- Unread count
- Read/unread state
- Order and delivery notifications
- Wishlist and price-drop notifications when available
- Clear empty state

### Acceptance criteria

- Users can identify unread notifications.
- Opening a notification moves to the relevant page.
- Mark-all-read is available.
- Notifications do not interfere with shopping.

## Phase 2 acceptance summary

- Account navigation is faster.
- Cart and checkout friction is reduced.
- Product detail pages provide clearer paths back to discovery.
- Order and notification journeys are easier to understand.
- Wishlist becomes a first-class shopping action.

## Phase 2 implementation files

- `apps/frontend/components/auth/AccountMenu.tsx`
- `apps/frontend/components/storefront/CartDrawer.tsx`
- `apps/frontend/app/(storefront)/products/[id]/page.tsx`
- `apps/frontend/app/(storefront)/orders/[id]/page.tsx`
- `apps/frontend/app/(storefront)/notifications/page.tsx`
- `apps/frontend/lib/hooks/use-cart-hydration.ts`
- Relevant order and notification data files

# Phase 3 — Personalization and Discovery

## Objective

Use Marketplace's existing catalog, vendor, order, wishlist, and recently viewed data to create a more personalized shopping experience.

## 3.1 Add a For You entry point

### Changes

Create a personalized entry point that can initially include:

- Recently viewed products
- Recommended products based on catalog activity
- Products from followed or previously viewed vendors
- Current deals
- Wishlist items
- Reorder suggestions when order data is available

### Acceptance criteria

- The page works with no user history.
- Recommendations are clearly labeled.
- Users can leave the personalized view and return to the full catalog.
- Empty states explain why recommendations are not shown.

## 3.2 Add recommendation modules

### Changes

Add recommendation modules to:

- Home page
- Product detail page
- Cart drawer
- Vendor page
- Deals page

Recommended recommendation types:

- Similar products
- Products from the same vendor
- Frequently bought together
- Deals related to the current category
- Recently viewed products

### Acceptance criteria

- Recommendations are relevant to the current page.
- Recommendation cards have clear actions.
- Recommendation sections do not duplicate the same products excessively.
- Recommendations remain usable when data is incomplete.

## 3.3 Add saved searches and alerts

### Changes

Allow users to save searches and receive alerts when matching products become available or change price.

### Acceptance criteria

- Saved searches can be viewed and removed.
- Alerts are tied to the user account.
- Users can opt in and opt out.
- Empty inventory states provide a recovery action.

## 3.4 Add advanced discovery filters

### Changes

Add filters and sorting appropriate to the catalog:

- Category
- Vendor
- Price
- Availability
- Delivery availability
- Rating when available
- Sort by popularity, newest, price low-to-high, or price high-to-low

### Acceptance criteria

- Filter and sort state is visible.
- Users can reset filters.
- The URL represents the current view where practical.
- Large result sets remain responsive.

## Phase 3 acceptance summary

- Marketplace has a personalized discovery experience.
- Users can find products through recommendations, saved searches, and advanced filters.
- Existing catalog and vendor data are used more effectively.
- The platform is ready for later loyalty and business features.

## Phase 3 implementation files

- `apps/frontend/app/(storefront)/for-you/page.tsx` or equivalent route
- `apps/frontend/components/storefront/CatalogGrid.tsx`
- Product recommendation components
- Search and filter components
- User preference and saved-search data models
- Analytics events

# Phase 4 — Trust, Support, and Seller Experience

## Objective

Give buyers and sellers the support and trust signals expected from a mature marketplace.

## 4.1 Expand Help Center

### Changes

Create structured help sections for:

- Orders
- Delivery
- Returns and refunds
- Payments
- Account access
- Vendor onboarding
- Seller policies

### Acceptance criteria

- Users can find answers without contacting support first.
- Help topics have searchable headings.
- Each article links to the relevant page or support action.
- Help content is accessible from the footer and account menu.

## 4.2 Add trust indicators

### Changes

Show trust indicators in relevant locations:

- Header or announcement bar
- Checkout
- Product pages
- Footer
- Order pages

Examples:

- Secure checkout
- Verified vendors
- Delivery tracking
- Return policy
- Customer support availability

### Acceptance criteria

- Trust messages are accurate and not misleading.
- Trust indicators do not overcrowd the header.
- Users can access the full policy from the indicator.

## 4.3 Add live or assisted support

### Changes

Start with a support entry point, then add live chat or a structured support request flow.

Recommended initial flow:

- Help Center
- Contact support
- Order-specific support request
- Support status confirmation

### Acceptance criteria

- Users can submit a support request with an order reference.
- Users receive a confirmation or ticket number.
- Support requests are stored and visible to the appropriate operational team.
- The flow works without exposing sensitive information.

## 4.4 Improve seller and vendor navigation

### Changes

Add clear vendor-facing navigation for:

- Vendor dashboard
- Products
- Inventory
- Orders
- Promotions
- Analytics
- Settings
- Dead-letter or exception queue

### Acceptance criteria

- Vendors can reach operational tasks without entering the admin portal.
- Vendor permissions remain separate from admin permissions.
- Vendor navigation matches the operational route structure.
- Vendor support links are available.

## Phase 4 acceptance summary

- Marketplace has stronger trust and support signals.
- Buyers can resolve common issues without unnecessary navigation.
- Vendors have a clearer operational experience.
- Seller and buyer journeys remain permission-separated.

## Phase 4 implementation files

- `apps/frontend/components/storefront/StorefrontFooter.tsx`
- `apps/frontend/app/(storefront)/help/page.tsx`
- Support request components
- Vendor navigation components
- Trust and policy components
- Support and vendor data services

# Phase 5 — Loyalty, B2B, and Mobile Extension

## Objective

Add commercial differentiation after the core navigation, discovery, and support foundations are stable.

## 5.1 Loyalty program

### Changes

Introduce a loyalty model with:

- Points for purchases
- Points for reviews or referrals when appropriate
- Tiered benefits
- Free-shipping eligibility
- Exclusive deals
- Account-level loyalty summary

### Acceptance criteria

- Users can see their current tier and points.
- Earning and redemption events are auditable.
- Benefits are displayed before checkout.
- Loyalty behavior is reflected in analytics.
- Rewards cannot be redeemed incorrectly when eligibility changes.

## 5.2 B2B portal

### Changes

Create a separate B2B experience for:

- Bulk product ordering
- Quantity breaks
- Request for quotation
- Company accounts
- Purchase approvals
- Invoicing
- Bulk order history

### Acceptance criteria

- B2B users cannot access restricted buyer-only actions.
- Bulk quantities are validated.
- Approval workflows are clear.
- Invoices and order history are available to authorized users.
- The B2B portal has a separate navigation entry point.

## 5.3 Mobile app experience

### Changes

Add app promotion and mobile-specific navigation patterns:

- App download CTA
- Deep links for products, orders, and vendors
- Push notification support
- Mobile cart and wishlist shortcuts
- Mobile-friendly mega-menu behavior

### Acceptance criteria

- App links are accurate and tested.
- Deep links open the intended marketplace page.
- Mobile navigation does not require excessive tapping.
- Cart and account state remain consistent across web and app.

## Phase 5 acceptance summary

- Marketplace has loyalty and B2B differentiation.
- Mobile users receive a more focused navigation experience.
- Commercial features are built on reliable account, order, and analytics foundations.

## Phase 5 implementation files

- Loyalty account and reward services
- B2B account and quotation services
- Mobile routing configuration
- App CTA components
- Mobile navigation components
- Analytics events

# Phase 6 — Measurement, Optimization, and Continuous Improvement

## Objective

Measure whether the navigation changes improve discovery, conversion, and user satisfaction.

## 6.1 Define navigation metrics

Track:

- Search usage
- Mega-menu open and click-through rates
- Category click-through rate
- Product-to-cart conversion
- Cart-to-checkout conversion
- Wishlist usage
- Order-page access
- Help-center search success
- Support request volume
- Bounce rate from the home page
- Mobile navigation completion rate

## 6.2 Add analytics events

Recommended events:

- Navigation item clicked
- Mega menu opened
- Category selected
- Filter applied
- Filter reset
- Product viewed
- Product added to cart
- Product added to wishlist
- Checkout started
- Order viewed
- Notification opened
- Help article opened
- Support request started

## 6.3 Add usability testing

Test these journeys:

1. Find a product by category.
2. Find a product by search.
3. Add a product to the cart.
4. Change a cart quantity.
5. View an order.
6. Find help for a delivery problem.
7. Find a vendor.
8. Use the mobile header.

## 6.4 Optimization backlog

Use measurement results to prioritize:

- New categories
- Recommendation quality
- Search relevance
- Filter improvements
- Header layout changes
- Footer link changes
- Support flow improvements
- Mobile navigation changes

## Phase 6 acceptance summary

- Navigation performance is measurable.
- Every major navigation change has an associated success metric.
- Optimization work is driven by evidence rather than assumptions.
- The roadmap can be updated with measured results.

# 7. Recommended Delivery Order

The phases should be implemented in this order:

| Order | Phase | Reason |
|---:|---|---|
| 1 | Phase 0 | Prevents inconsistent navigation and route decisions |
| 2 | Phase 1 | Delivers the largest immediate improvement using existing pages |
| 3 | Phase 2 | Improves the core shopping and account journey |
| 4 | Phase 3 | Adds personalization after discovery and data foundations exist |
| 5 | Phase 4 | Adds trust, support, and vendor maturity |
| 6 | Phase 5 | Adds differentiated commercial features |
| 7 | Phase 6 | Measures and optimizes all changes continuously |

# 8. Proposed Timeline

The timeline is an estimate and should be adjusted after Phase 0 planning.

| Phase | Estimated duration | Main outcome |
|---|---:|---|
| Phase 0 | 1 week | Approved navigation architecture and design |
| Phase 1 | 2–4 weeks | Expanded header, mega menu, filters, recently viewed, footer redesign |
| Phase 2 | 4–6 weeks | Better account, cart, product, order, and notification journeys |
| Phase 3 | 6–10 weeks | Personalization, recommendations, saved searches, advanced discovery |
| Phase 4 | 6–8 weeks | Help, trust, support, and vendor experience |
| Phase 5 | 10–16 weeks | Loyalty, B2B, and mobile extension |
| Phase 6 | Ongoing | Measurement, testing, and optimization |

# 9. Final Target State

The target Marketplace experience should include:

- 5 primary header destinations
- A category-aware Shop mega menu
- Persistent Account, Wishlist, Cart, and Orders actions
- A five-column footer with buyer, seller, company, and support links
- Recently viewed and personalized product discovery
- Advanced filters and category counts
- Strong product detail and order navigation
- A structured Help Center and support flow
- Vendor-specific operational navigation
- Loyalty and B2B capabilities in later phases
- Measurable navigation and conversion metrics

This target state brings Marketplace closer to the navigation completeness of Amazon and Flipkart while preserving its existing buyer, vendor, and operational architecture.

# 10. References

- Marketplace storefront header: `apps/frontend/components/storefront/StorefrontHeader.tsx`
- Marketplace storefront footer: `apps/frontend/components/storefront/StorefrontFooter.tsx`
- Marketplace account menu: `apps/frontend/components/auth/AccountMenu.tsx`
- Marketplace cart drawer: `apps/frontend/components/storefront/CartDrawer.tsx`
- Marketplace storefront routes: `apps/frontend/app/(storefront)/`
- Marketplace admin and vendor routes: `apps/frontend/app/(operational)/`
- Flipkart: https://www.flipkart.com
- Amazon: https://www.amazon.com
