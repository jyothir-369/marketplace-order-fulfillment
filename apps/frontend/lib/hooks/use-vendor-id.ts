"use client";

import { useAuth } from "@/lib/auth-context";

/**
 * The authenticated vendor's tenant id — resolved from the session, never from
 * a hardcoded constant (Phase 3 — no client-supplied tenant ids).
 *
 * Returns `null` while the session is restoring or for non-vendors. The vendor
 * portal layout already requires a vendor role via <RequireRole>, so callers
 * inside that shell can rely on this being present once `status` settles.
 */
export function useVendorId(): string | null {
  const { user, status } = useAuth();
  if (status !== "authenticated" || !user) return null;
  return user.vendorId ?? null;
}