/**
 * use-role-guard — client-side role gate backed by the REAL auth context (§4.3).
 *
 * Reads the authenticated user from `useAuth()` (Phase 1 — no more
 * `window.__SESSION__` placeholder) and returns the guard state:
 *
 *   - `loading`: session restore still in flight — render a placeholder.
 *   - `allowed`: the user holds one of the required roles.
 *   - otherwise the hook redirects: unauthenticated users go to
 *     `/login?redirect=<current path>`, authenticated-but-wrong-role users
 *     go back to `/products`.
 *
 * Usage:
 *   const guard = useRoleGuard(["admin", "operations"]);
 *   if (guard.loading) return <Loading />;
 *   if (!guard.allowed) return null; // redirect handled by the hook
 */

"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export type Role = "buyer" | "vendor" | "admin" | "operations";

interface UseRoleGuardResult {
  role: Role | null;
  allowed: boolean;
  loading: boolean; // true while the session restore is in flight
}

export function useRoleGuard(required: readonly Role[]): UseRoleGuardResult {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const loading = status === "idle" || status === "loading";

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Unauthenticated → send to the login page, preserving the destination.
      const redirect = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirect}`);
      return;
    }

    if (!required.includes(user.role as Role)) {
      router.replace("/products");
    }
  }, [loading, user, required, router, pathname]);

  const role = (user ? (user.role as Role) : null) as Role | null;

  const allowed = useMemo(
    () => Boolean(user && role && required.includes(role)),
    [user, role, required],
  );

  return { role, allowed, loading };
}