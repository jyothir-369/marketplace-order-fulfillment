/**
 * lib/analytics.ts — Phase 6 measurement (non-blocking, privacy-conscious).
 * Consistent event schema connected to existing app architecture.
 */
export interface AnalyticsEvent {
  event: string;
  category?: string;
  label?: string;
  value?: number;
  properties?: Record<string, unknown>;
}

const EVENTS: readonly string[] = [
  "navigation_clicked",
  "mega_menu_opened",
  "category_selected",
  "filter_applied",
  "filter_reset",
  "product_viewed",
  "product_added_to_cart",
  "product_added_to_wishlist",
  "checkout_started",
  "order_viewed",
  "notification_opened",
  "help_article_opened",
  "support_request_started",
];

export function track({ event, category, label, value, properties }: AnalyticsEvent) {
  if (typeof window === "undefined") return; // server / SSR guard
  if (!EVENTS.includes(event)) {
    // non-blocking: never throw; silently ignore unknown events
    return;
  }
  // Privacy-conscious: no PII in properties; only structural labels
  try {
    // Non-blocking: queue to localStorage + optional future endpoint
    const entry = {
      event,
      category: category ?? "navigation",
      label,
      value,
      properties,
      at: new Date().toISOString(),
    };
    const queue = JSON.parse(localStorage.getItem("mp_analytics_queue") || "[]") as unknown[];
    queue.push(entry);
    // Cap queue length to prevent unbounded growth
    if (queue.length > 200) queue.shift();
    localStorage.setItem("mp_analytics_queue", JSON.stringify(queue));
    // Fire-and-forget console only in dev; no external calls in this phase
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.info("[analytics]", entry);
    }
  } catch {
    // Fully non-blocking: ignore any write failure
  }
}

export const AnalyticsMetrics = {
  NAVIGATION_METRICS: [
    "Search usage",
    "Mega-menu open rate",
    "Category click-through",
    "Product-to-cart conversion",
    "Cart-to-checkout conversion",
    "Wishlist usage",
    "Order-page access",
    "Help-center search success",
    "Support request volume",
    "Home bounce rate",
    "Mobile nav completion",
  ],
  TEST_JOURNEYS: [
    "Find a product by category",
    "Find a product by search",
    "Add a product to the cart",
    "Change a cart quantity",
    "View an order",
    "Find help for a delivery problem",
    "Find a vendor",
    "Use the mobile header",
  ],
} as const;
