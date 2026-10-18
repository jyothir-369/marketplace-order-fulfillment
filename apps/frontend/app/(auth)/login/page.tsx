/**
 * app/(auth)/login/page.tsx — Exact layout per Step 2/3 (layout fix only).
 */
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in — Marketplace" };
export const dynamic = "force-dynamic";

function safeRedirect(raw: string | undefined): string {
  if (!raw) return "/products";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/products";
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; portal?: string }>;
}) {
  const { redirect, portal } = await searchParams;
  const portalValue = portal === "vendor" ? "vendor" : "customer";

  return (
    <main className="login-root" style={{ margin: 0, padding: 0 }}>
      <img
        className="login-bg"
        src="/Marketplace.png"
        alt=""
      />
      <section className="login-card" aria-label="Sign in" style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
        {/* 1. Logo row */}
        <div style={{ marginTop: 0, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E0A020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-sans), Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '28px', lineHeight: 1, color: '#0F2A5C', letterSpacing: '-0.02em' }}>
              Marketplace
            </span>
          </div>
        </div>

        {/* 2. Heading */}
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '48px', lineHeight: 1.1, color: '#0F2A5C', marginTop: 22, marginBottom: 0, whiteSpace: 'nowrap' }}>
          Welcome back
        </h1>

        {/* 3. Subtitle */}
        <p style={{ fontSize: '18px', lineHeight: 1.45, color: '#6B7A90', marginTop: 10, marginBottom: 0 }}>
          Sign in to manage your orders and access the vendor &amp; admin portals.
        </p>

        {/* 4-11 Form (logic unchanged) */}
        <LoginForm redirectTo={safeRedirect(redirect)} portal={portalValue} />
      </section>
    </main>
  );
}
