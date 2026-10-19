/**
 * app/(auth)/layout.tsx — centered auth shell (Phase 1).
 *
 * Standalone route group WITHOUT the storefront header/footer so sign-in and
 * registration get a quiet, focused surface.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Marketplace",
    default: "Account",
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)] px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}