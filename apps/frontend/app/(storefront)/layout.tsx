/**
 * app/(storefront)/layout.tsx — Storefront route group layout (§2.2).
 *
 * Applies the low-density, high-contrast buyer mode layout:
 *   - <StorefrontHeader> sticky at top (glassmorphic)
 *   - CartDrawer (slide-over sheet, Radix + framer-motion)
 *   - Generous whitespace layout
 */

import type { Metadata } from "next";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
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
        className="min-h-screen bg-[var(--color-background)]"
        data-density="comfortable"
      >
        {children}
      </main>
    </>
  );
}
