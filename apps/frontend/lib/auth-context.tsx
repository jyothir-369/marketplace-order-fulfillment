/**
 * lib/auth-context.tsx — AuthProvider + useAuth() (Phase 1).
 *
 * Client-side session management against the backend's JWT endpoints:
 *   - restore: on mount, if an access token exists, verify via GET /me;
 *     if it 401s, exchange the stored refresh token for a fresh pair.
 *   - login / register / logout wrap the api.client calls and hang on to
 *     the token pair in localStorage (lib/auth-token).
 *   - refreshSession: silent rotation used to recover from an expired
 *     access token (and by the RequireRole gate on 401).
 *
 * The provider is mounted once at the app root; page/layout guards consume
 * `useAuth()` — never `window.__SESSION__` (see lib/hooks/use-role-guard.ts).
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LoginDto, RegisterDto, UserDto } from "@/lib/types";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "@/lib/auth-token";
import {
  getMe,
  loginAccount,
  registerAccount,
  logoutAccount,
  refreshAccessToken,
} from "@/lib/api";

export type AuthStatus =
  | "idle" // provider mounted, not yet attempted restore
  | "loading" // restore/login in flight
  | "authenticated"
  | "unauthenticated";

interface AuthContextValue {
  user: UserDto | null;
  status: AuthStatus;
  login: (dto: LoginDto) => Promise<UserDto>;
  register: (dto: RegisterDto) => Promise<UserDto>;
  logout: () => Promise<void>;
  /** Silent token rotation + user reload. Resolves true when a session exists. */
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applyTokens(tokens: { accessToken: string; refreshToken: string; id: string; email: string; role: UserDto["role"]; displayName: string | null; vendorId: string | null }): UserDto {
  setTokens(tokens.accessToken, tokens.refreshToken);
  return {
    id: tokens.id,
    email: tokens.email,
    role: tokens.role,
    displayName: tokens.displayName,
    vendorId: tokens.vendorId,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [status, setStatus] = useState<AuthStatus>("idle");

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    const accessToken = getAccessToken();
    if (!refreshToken && !accessToken) {
      setUser(null);
      setStatus("unauthenticated");
      return false;
    }

    // 1) Try to verify the current access token directly.
    if (accessToken) {
      try {
        const me = await getMe();
        setUser(me);
        setStatus("authenticated");
        return true;
      } catch {
        // fall through to refresh
      }
    }

    // 2) Access token missing/expired — rotate using the refresh token.
    if (refreshToken) {
      try {
        const tokens = await refreshAccessToken(refreshToken);
        const freshUser = applyTokens(tokens);
        setUser(freshUser);
        setStatus("authenticated");
        return true;
      } catch {
        // Refresh token invalid/revoked — full sign-out.
        clearTokens();
        setUser(null);
        setStatus("unauthenticated");
        return false;
      }
    }

    setUser(null);
    setStatus("unauthenticated");
    return false;
  }, []);

  // Session restore on first client render. refreshSession() owns the
  // status transitions; the effect just kicks it off once.
  useEffect(() => {
    setStatus("loading");
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (dto: LoginDto): Promise<UserDto> => {
      setStatus("loading");
      const tokens = await loginAccount(dto);
      const freshUser = applyTokens(tokens);
      setUser(freshUser);
      setStatus("authenticated");
      return freshUser;
    },
    [],
  );

  const register = useCallback(
    async (dto: RegisterDto): Promise<UserDto> => {
      setStatus("loading");
      const created = await registerAccount(dto);
      // Register provisions the account only; complete a login to get tokens.
      const tokens = await loginAccount({ email: dto.email, password: dto.password });
      const freshUser = applyTokens(tokens);
      setUser(freshUser);
      setStatus("authenticated");
      return freshUser;
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await logoutAccount(refreshToken);
      } catch {
        // Idempotent server-side; ignore network failures on sign-out.
      }
    }
    clearTokens();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, refreshSession }),
    [user, status, login, register, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}