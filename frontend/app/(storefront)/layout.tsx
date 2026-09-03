/**
 * app/(storefront)/layout.tsx — Storefront route group layout (§2.2).
 *
 * Applies the low-density, high-contrast buyer mode layout:
 *   - <StorefrontHeader> sticky at top
 *   - Generous whitespace layout
 *   - Cart counter hydration guard via StorefrontHeader
 */

import type { Metadata } from "next";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";

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
      <main className="min-h-screen bg-zinc-50">{children}</main>
    </>
  );
}
