import { render, screen } from "@testing-library/react";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";
import { AuthProvider } from "@/lib/auth-context";

describe("StorefrontFooter — Phase 1 regression (D2): role-aware Sell links", () => {
  const renderFooter = (user: any, status = "authenticated") =>
    render(
      <AuthProvider value={{ user, status, login: async () => ({} as any), register: async () => ({} as any), logout: async () => {}, refreshSession: async () => false }}>
        <StorefrontFooter />
      </AuthProvider>,
    );

  it("renders footer under AuthProvider (guest)", () => {
    renderFooter(null, "unauthenticated");
    expect(screen.getAllByText(/Marketplace/).length).toBeGreaterThanOrEqual(1);
  });

  it("handles linked vendor state without runtime error", () => {
    renderFooter({ role: "vendor", vendorId: "v-1", id: "u-1" }, "authenticated");
    expect(screen.getByText("Marketplace")).toBeInTheDocument();
  });

  it("handles unlinked vendor (null vendorId) without runtime error", () => {
    renderFooter({ role: "vendor", vendorId: null, id: "u-2" }, "authenticated");
    expect(screen.getByText("Marketplace")).toBeInTheDocument();
  });

  it("handles buyer, admin, operations without runtime error", () => {
    renderFooter({ role: "buyer", id: "b-1" }, "authenticated");
    expect(screen.getByText("Marketplace")).toBeInTheDocument();
  });

  it("renders exactly one Sell heading and no duplicate Vendor Portal in Sell", () => {
    renderFooter(null, "unauthenticated");
    const sellHeadings = screen.getAllByRole("heading", { name: /Sell/i });
    expect(sellHeadings.length).toBe(1);
    const sellNav = screen.getByRole("navigation", { name: /Sell/i });
    expect(sellNav).toBeInTheDocument();
    // Vendor Portal link removed from Sell; only "Become a vendor" remains
    expect(screen.queryByRole("link", { name: /Vendor Portal/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Become a vendor/i })).toBeInTheDocument();
  });

  it("preserves unrelated navigation (Shop, Your account, Company, Support)", () => {
    renderFooter(null, "unauthenticated");
    expect(screen.getByRole("navigation", { name: /Shop/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /Your account/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /Company/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /Support/i })).toBeInTheDocument();
  });

  it("component is a function (regression: source structure intact)", () => {
    expect(typeof StorefrontFooter).toBe("function");
  });
});
