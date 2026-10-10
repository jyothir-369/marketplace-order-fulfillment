/**
 * app/(auth)/register/page.tsx — Create account (Phase 1).
 *
 * Public BUYER self-registration. Reads the same sanitized `redirect` param
 * as the login page so a signup midway through a gated flow lands back where
 * the user was headed.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

function safeRedirect(raw: string | undefined): string {
  if (!raw) return "/products";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/products";
  return raw;
}

export default async function RegisterPage({
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
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Create your account</h1>
      <p className="mt-1 text-sm text-[var(--color-warm-muted)]">
        Shop, track orders, and check out across every vendor on Marketplace.
      </p>
      <RegisterForm redirectTo={safeRedirect(redirect)} />
    </div>
  );
}