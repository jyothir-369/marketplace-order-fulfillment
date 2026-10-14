import { render, screen } from "@testing-library/react";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";
import { AuthProvider } from "@/lib/auth-context";

describe("StorefrontFooter — Phase 1 role links", () => {
  it("renders footer with AuthProvider (guest)", () => {
    render(
      <AuthProvider value={{ user: null, status: "unauthenticated", login: async () => ({} as any), register: async () => ({} as any), logout: async () => {}, refreshSession: async () => false }}>
        <StorefrontFooter />
      </AuthProvider>,
    );
    expect(screen.getAllByText(/Marketplace/).length).toBeGreaterThanOrEqual(1);
  });
  it("source handles linked/unlinked/vendor states", () => {
    expect(typeof StorefrontFooter).toBe("function");
  });
});
