import type { Metadata } from "next";
import "./globals.css";

/**
 * Root layout — no shared header; each route group (storefront, vendor, admin)
 * provides its own layout shell. This keeps the buyer and operational experiences
 * fully separated at the layout level.
 */
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
