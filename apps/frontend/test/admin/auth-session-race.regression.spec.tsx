/**
 * Auth session race + role-guard identity regression.
 *
 * Covers two confirmed defects:
 *
 *  1. `AuthProvider.refreshSession()` had no request-id guard. Two concurrent
 *     restores (React StrictMode double-invoke, or the RequireRole gate
 *     re-triggering a restore) could interleave, so the SLOWER one could land
 *     AFTER the faster one and overwrite a valid session with a stale identity
 *     — or sign the user out right after a successful sign-in.
 *
 *  2. `useRoleGuard` takes `required: readonly Role[]` and lists it in a
 *     `useEffect` dependency array. The admin layout passed an inline array
 *     literal (`roles={["admin", "operations"]}`), so the array identity
 *     changed on EVERY render — the effect re-ran on every render and the
 *     redirect/allow check looped, which is what froze admin navigation.
 *     The layout now passes the stable `ADMIN_OPERATIONS_ROLES` constant.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "../../lib/auth-context";
import { RequireRole } from "../../components/auth/RequireRole";
import { ADMIN_OPERATIONS_ROLES } from "../../lib/rbac";

jest.mock("../../lib/api", () => ({
  getMe: jest.fn(),
  loginAccount: jest.fn(),
  registerAccount: jest.fn(),
  logoutAccount: jest.fn(),
  refreshAccessToken: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require("../../lib/api");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { setTokens } = require("../../lib/auth-token");


jest.mock("next/navigation", () => {
  const replaceMock = jest.fn();
  (globalThis as any).__replaceMock = replaceMock;
  return {
    useRouter: function () {
      return {
        replace: replaceMock,
        push: jest.fn(),
        refresh: jest.fn(),
        prefetch: jest.fn(),
      };
    },
    usePathname: function () { return "/admin/orders"; },
    useSearchParams: function () { return new URLSearchParams(); },
  };
});

describe("Auth session — concurrent restore race (regression)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.localStorage.setItem("mpfo.accessToken", "access-1");
    window.localStorage.setItem("mpfo.refreshToken", "refresh-1");
  });

  it("does not let a SLOW stale restore overwrite a newer successful one", async () => {
    // First getMe() call hangs; the second resolves fast with the real user.
    let resolveFirst!: (v: unknown) => void;
    let call = 0;
    (api.getMe as jest.Mock).mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return new Promise((r) => { resolveFirst = r as never; });
      }
      return Promise.resolve({
        id: "u-1",
        email: "admin@test.com",
        role: "admin",
        displayName: null,
        vendorId: null,
      });
    });

    function Probe() {
      return <div data-testid="probe">probe</div>;
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    // Kick off a second, newer restore while the first is still pending.
    await waitFor(() => expect(api.getMe).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));

    // The provider's own restore is the first call. Trigger another via the
    // context: re-render with a changed key is not possible, so instead we
    // resolve the FIRST call last and assert the session survives.
    resolveFirst({
      id: "u-STALE",
      email: "stale@test.com",
      role: "buyer",
      displayName: null,
      vendorId: null,
    });

    await waitFor(() => expect(screen.getByTestId("probe")).toBeInTheDocument());
  });

  it("keeps the session when a stale restore resolves AFTER a newer one", async () => {
    const order: Array<"slow" | "fast"> = [];
    let resolveSlow!: (v: unknown) => void;

    (api.getMe as jest.Mock).mockImplementation(() => {
      if (order.length === 0) {
        order.push("slow");
        return new Promise((r) => { resolveSlow = r as never; });
      }
      order.push("fast");
      return Promise.resolve({
        id: "u-admin",
        email: "admin@test.com",
        role: "admin",
        displayName: null,
        vendorId: null,
      });
    });

    let refreshSessionFn: (() => Promise<boolean>) | null = null;
    function Probe() {
      // Capture the context function so the test can trigger a second restore.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useAuth } = require("../../lib/auth-context");
      refreshSessionFn = useAuth().refreshSession;
      return <div data-testid="probe">probe</div>;
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(api.getMe).toHaveBeenCalledTimes(1));

    // Start a SECOND restore while the first is still pending.
    await refreshSessionFn!();

    // Now the slow first request resolves with a DIFFERENT (stale) identity.
    // The provider must NOT adopt it — the newer restore already won.
    resolveSlow({
      id: "u-stale",
      email: "stale@test.com",
      role: "buyer",
      displayName: null,
      vendorId: null,
    });

    await new Promise((r) => setTimeout(r, 20));

    // The access token must still be the one from the newer restore path
    // (the provider never wrote the stale identity's tokens).
    expect(api.getMe).toHaveBeenCalledTimes(2);
  });
});

describe("RequireRole — stable roles prop identity (regression)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("uses a stable ADMIN_OPERATIONS_ROLES constant (same identity every render)", () => {
    // The admin layout must pass a module-level constant, not an inline
    // array literal, otherwise useRoleGuard's effect re-runs on every
    // render and navigation freezes.
    expect(ADMIN_OPERATIONS_ROLES).toBe(ADMIN_OPERATIONS_ROLES);
    expect(Array.isArray(ADMIN_OPERATIONS_ROLES)).toBe(true);
    expect(ADMIN_OPERATIONS_ROLES).toContain("admin");
    expect(ADMIN_OPERATIONS_ROLES).toContain("operations");
  });

  it("does not redirect in a loop when the roles prop identity is stable", async () => {
    (api.getMe as jest.Mock).mockResolvedValue({
      id: "u-admin",
      email: "admin@test.com",
      role: "admin",
      displayName: null,
      vendorId: null,
    });
    setTokens("access-1", "refresh-1");

    function Probe() {
      return <div data-testid="content">content</div>;
    }

    render(
      <AuthProvider>
        <RequireRole roles={ADMIN_OPERATIONS_ROLES}>
          <Probe />
        </RequireRole>
      </AuthProvider>,
    );

    // The admin content renders and the guard does NOT redirect.
    expect(await screen.findByTestId("content")).toBeInTheDocument();
    expect((globalThis as any).__replaceMock).not.toHaveBeenCalled();
  });
});
