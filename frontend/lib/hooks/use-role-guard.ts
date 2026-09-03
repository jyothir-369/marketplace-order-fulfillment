/**
 * use-role-guard — client-side role guard hook (§4.3).
 *
 * Reads the current user role from a (placeholder) auth context and
 * redirects to /products if the user lacks the required role.
 *
 * The real auth implementation is out of scope for Phase 1 — this hook
 * currently assumes a session cookie / context value set by middleware.
 *
 * Usage:
 *   const guard = useRoleGuard("admin");
 *   if (!guard.allowed) return null;  // useEffect will redirect
 *
 * For now, the role comes from `window.__SESSION__` (set by middleware in
 * later phases); Phase 1 defaults to "buyer" when no role is available so
 * the build keeps compiling.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type Role = "buyer" | "vendor" | "admin";

interface SessionShape {
  role?: Role;
  userId?: string;
}

declare global {
  interface Window {
    __SESSION__?: SessionShape;
  }
}

interface UseRoleGuardResult {
  role: Role | null;
  allowed: boolean;
  ready: boolean;
}

/** Resolves the current session role from window globals. */
function readSessionRole(): Role | null {
  if (typeof window === "undefined") return null;
  return window.__SESSION__?.role ?? null;
}

export function useRoleGuard(required: Role): UseRoleGuardResult {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = readSessionRole();
    setRole(current);
    setReady(true);

    if (current !== required) {
      // Per DoD §6.3: redirect (not 403 page) when role is wrong.
      router.replace("/products");
    }
  }, [required, router]);

  return {
    role,
    allowed: role === required,
    ready,
  };
}
