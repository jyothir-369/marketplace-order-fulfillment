/**
 * lib/env.ts — single source of truth for client environment configuration.
 *
 * Resolves the backend API base URL used by lib/api.ts. Keeping the trailing
 * slash handling here prevents double-slashed URLs such as "//catalog" when
 * NEXT_PUBLIC_API_BASE_URL is configured with a trailing slash.
 */

const DEFAULT_API_BASE_URL = "http://localhost:3001/api";

function normalizeBaseUrl(value: string | undefined): string {
  if (!value) return DEFAULT_API_BASE_URL;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_API_BASE_URL;
  return trimmed;
}

export function getApiBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "";
  return normalizeBaseUrl(fromEnv || undefined);
}