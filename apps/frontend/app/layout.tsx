/**
 * Root layout — no shared header; each route group (storefront, vendor, admin)
 * provides its own layout shell. This keeps the buyer and operational experiences
 * fully separated at the layout level.
 *
 * PHASE 1 — V2 Premium typography foundation
 *
 * Font strategy: the design spec calls for Playfair Display (serif, display)
 * + Inter (sans, UI). We declare CSS variables `--font-display` and `--font-sans`
 * in globals.css and expose them via `style` on <html>. This avoids
 * `next/font/google`, which hard-fails the build when the sandbox cannot
 * reach fonts.googleapis.com.
 *
 * When the project ships to an environment that can self-host fonts (or has
 * network access), `next/font/local` or `@font-face` can be added here
 * without changing any consumer — they only need `--font-display` /
 * `--font-sans` to resolve to a stack that includes Playfair Display and
 * Inter first, with serif/sans-fallbacks behind.
 */

import type { Metadata } from "next";
import "./globals.css";

const fontVars: React.CSSProperties = {
  ["--font-display" as string]:
    '"Playfair Display", Georgia, "Times New Roman", serif',
  ["--font-sans" as string]:
    'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Marketplace Order & Fulfillment System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" style={fontVars}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}