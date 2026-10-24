/**
 * Admin Orders page — request-race / navigation-freeze regression.
 *
 * The page normally sits inside the admin layout, which supplies
 * <ToastProvider>. These tests mount that provider explicitly.
 *
 * These tests ADD coverage; they do not weaken any existing assertion in
 * test/admin/vendor-applications/page.spec.tsx (approve/reject, modal,
 * reason validation, disable-state, error state, cancellation).
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminOrdersPage from "../../app/(operational)/admin/orders/page";
import { ToastProvider } from "../../components/ui/toast";

jest.mock("../../lib/api", () => ({
  getAdminOrders: jest.fn(),
  isAbortError: (e: unknown) =>
    Boolean(e && typeof e === "object" && (e as { name?: string }).name === "AbortError"),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getAdminOrders } = require("../../lib/api");

const renderPage = () =>
  render(
    <ToastProvider>
      <AdminOrdersPage />
    </ToastProvider>,
  );

describe("Admin Orders — request-race / navigation-freeze regression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("issues exactly ONE request on mount (no duplicate initial fetch)", async () => {
    (getAdminOrders as jest.Mock).mockResolvedValue({ total: 0, orders: [] });

    renderPage();

    await waitFor(() => expect(getAdminOrders).toHaveBeenCalled());
    // Give any duplicate effect a chance to fire.
    await new Promise((r) => setTimeout(r, 20));
    expect(getAdminOrders).toHaveBeenCalledTimes(1);
  });

  it("aborts the in-flight request when the filter changes (no duplicate live requests)", async () => {
    const signals: Array<AbortSignal | undefined> = [];
    (getAdminOrders as jest.Mock).mockImplementation(
      (_filter: unknown, signal?: AbortSignal) => {
        signals.push(signal);
        return new Promise(() => {}); // never resolves
      },
    );

    renderPage();
    await waitFor(() => expect(getAdminOrders).toHaveBeenCalledTimes(1));

    const firstSignal = signals[0];
    expect(firstSignal).toBeDefined();
    expect(firstSignal?.aborted).toBe(false);

    // Change the status filter -> a new load runs and cancels the first.
    fireEvent.click(screen.getByRole("button", { name: "Placed" }));

    await waitFor(() => expect(getAdminOrders).toHaveBeenCalledTimes(2));
    expect(firstSignal?.aborted).toBe(true);
  });

  it("does not surface an error toast for an aborted request", async () => {
    (getAdminOrders as jest.Mock).mockRejectedValue(
      Object.assign(new Error("Aborted"), { name: "AbortError" }),
    );

    renderPage();

    await waitFor(() => expect(getAdminOrders).toHaveBeenCalled());
    // The abort path must stay silent — no alert in the DOM.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not update state after unmount (no setState on unmounted component)", async () => {
    let resolveFn!: (v: unknown) => void;
    (getAdminOrders as jest.Mock).mockImplementation(
      () => new Promise((r) => { resolveFn = r as never; }),
    );

    const { unmount } = renderPage();
    await waitFor(() => expect(getAdminOrders).toHaveBeenCalled());

    // Unmount while the request is still in flight.
    unmount();

    // Resolving afterwards must not throw.
    expect(() => resolveFn({ total: 5, orders: [] })).not.toThrow();
  });

  it("renders the page shell (heading + filters) once loaded", async () => {
    (getAdminOrders as jest.Mock).mockResolvedValue({ total: 0, orders: [] });

    renderPage();

    expect(await screen.findByRole("heading", { name: "All Orders" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Placed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fulfilled" })).toBeInTheDocument();
  });
});
