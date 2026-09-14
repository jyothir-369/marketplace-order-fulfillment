/**
 * lib/rbac.ts — role registry + route access rules (Phase 1).
 *
 * Single source of truth for which roles may enter each operational area.
 * Mirrors the backend @Roles() metadata; keep the two in sync.
 */

import type { UserRole } from "@/lib/types";

/** Roles allowed into the admin/operations portal. */
export const ADMIN_OPERATIONS_ROLES: readonly UserRole[] = ["admin", "operations"];

/** Roles allowed into the vendor portal. */
export const VENDOR_ROLES: readonly UserRole[] = ["vendor"];

/** Roles allowed to mutate catalog + configure vendor integrations. */
export const CATALOG_WRITE_ROLES: readonly UserRole[] = ["vendor", "admin"];

export function hasAnyRole(
  role: UserRole | null | undefined,
  allowed: readonly UserRole[],
): boolean {
  if (!role) return false;
  return allowed.includes(role);
}