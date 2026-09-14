/**
 * components/auth/RequireRole.tsx — client boundary that gates an operational
 * route group by role (Phase 1). Wraps a layout's children:
 *
 *   <RequireRole roles={["admin", "operations"]}>…</RequireRole>
 *
 * While the auth session is restoring it renders a compact placeholder so the
 * shell never flashes gated content; once resolved, unauthenticated users are
 * redirected to /login?redirect=… and wrong-role users to /products.
 */

"use client";

import { type ReactNode } from "react";
import { useRoleGuard, type Role } from "@/lib/hooks/use-role-guard";

export function RequireRole({
  roles,
  children,
  fallback,
}: {
  roles: readonly Role[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { loading, allowed } = useRoleGuard(roles);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        {fallback ?? (
          <div className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]"
              aria-hidden
            />
            Checking access&hellip;
          </div>
        )}
      </div>
    );
  }

  if (!allowed) return null; // redirect handled by useRoleGuard

  return <>{children}</>;
}