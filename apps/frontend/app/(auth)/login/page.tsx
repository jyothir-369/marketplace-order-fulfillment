/**
 * app/(auth)/login/page.tsx — Sign in (Phase 1).
 *
 * Reads the `redirect` query param (set by useRoleGuard when a gated route
 * was hit unauthenticated) and passes it to the client LoginForm. The value
 * is sanitized to an internal path so open-redirects aren't possible.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

function safeRedirect(raw: string | undefined): string {
  if (!raw) return "/products";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/products";
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <div className="rounded-2xl border border-[var(--color-warm-border)] bg-[var(--color-card)] p-8 shadow-sm">
      <Link href="/products" className="mb-6 inline-block font-display text-xl font-bold tracking-tight text-[var(--color-foreground)]">
        Marketplace
      </Link>
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Welcome back</h1>
      <p className="mt-1 text-sm text-[var(--color-warm-muted)]">
        Sign in to manage your orders and access the vendor &amp; admin portals.
      </p>
      <LoginForm redirectTo={safeRedirect(redirect)} />
    </div>
  );
}