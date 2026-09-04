/**
 * app/(storefront)/layout.tsx — Storefront route group layout.
 *
 * V2 Premium shell:
 *   - <StorefrontHeader> sticky at top with editorial announcement bar
 *   - <CartDrawer> slide-over sheet
 *   - <StorefrontFooter> editorial 4-column footer
 *   - Generous whitespace layout on warm ivory surface
 *
 * Layout only — no catalog/PDP item cards (Phase 3) or support screens
 * (Phase 4).
 */

import type { Metadata } from "next";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";
import { CartDrawer } from "@/components/storefront/CartDrawer";

export const metadata: Metadata = {
  title: {
    template: "%s | Marketplace",
    default: "Marketplace",
  },
  description: "Browse products and place orders on the Marketplace storefront.",
};

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StorefrontHeader />
      <CartDrawer />
      <main
        className="min-h-screen bg-background"
        data-density="comfortable"
      >
        {children}
      </main>
      <StorefrontFooter />
    </>
  );
}