/**
 * lib/auth-token.ts — client-side JWT token store (Phase 1).
 *
 * Access + refresh tokens are kept in localStorage (SSR-safe: all reads get
 * a no-op when `window` is undefined, so server-rendered code never touches
 * the browser storage API).
 *
 * Storage keys fall under a `mpfo.` namespace so they are easy to clear and
 * can never collide with other apps on the same origin.
 */

export const ACCESS_TOKEN_KEY = "mpfo.accessToken";
export const REFRESH_TOKEN_KEY = "mpfo.refreshToken";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAccessToken(): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // Storage unavailable (e.g. private mode) — session simply won't persist.
  }
}

export function clearTokens(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}