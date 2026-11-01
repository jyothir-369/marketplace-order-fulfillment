import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AddressesPage from "../../../app/account/addresses/page";

jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "buyer@example.com",
      role: "buyer",
      displayName: "Test Buyer",
      vendorId: null,
      bio: null,
    },
    status: "authenticated",
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshSession: jest.fn(),
  }),
}));

const API = "http://localhost:3001/api";

const address = {
  id: "address-1",
  label: "Home",
  street: "123 Main Street",
  city: "Ludhiana",
  state: "Punjab",
  zip: "141001",
  country: "India",
  isDefault: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

describe("Saved Addresses page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock) = jest.fn();
  });

  it("shows the empty state when the user has no saved addresses", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ addresses: [] }),
    );

    render(<AddressesPage />);

    expect(await screen.findByText("No addresses saved.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New address/i })).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/customer/addresses`,
      expect.objectContaining({ headers: expect.objectContaining({ "Content-Type": "application/json" }) }),
    );
  });

  it("shows a useful error and allows retry when loading fails", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(jsonResponse({ addresses: [] }));

    render(<AddressesPage />);

    expect(await screen.findByText("Failed to load addresses")).toBeInTheDocument();
    expect(screen.getByText("Network unavailable")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    expect(await screen.findByText("No addresses saved.")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("creates an address and reloads the saved address list", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === `${API}/customer/addresses` && method === "POST") {
          return jsonResponse({ address });
        }

        if (url === `${API}/customer/addresses` && method === "GET") {
          return jsonResponse({ addresses: [address] });
        }

        throw new Error(`Unexpected request: ${method} ${url}`);
      },
    );

    render(<AddressesPage />);

    fireEvent.click(await screen.findByRole("button", { name: /New address/i }));

    fireEvent.change(screen.getByLabelText("Label"), {
      target: { value: "Home" },
    });
    fireEvent.change(screen.getByLabelText("Street / Address"), {
      target: { value: "123 Main Street" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Ludhiana" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Address/i }));

    expect(await screen.findByText("123 Main Street")).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/customer/addresses`,
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("123 Main Street"),
      }),
    );
  });

  it("confirms deletion and refreshes the list", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    (global.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === `${API}/customer/addresses` && method === "GET") {
          return jsonResponse({
            addresses: global.fetch.mock.calls.filter(
              (call: unknown[]) =>
                String(call[0]) === `${API}/customer/addresses/address-1`,
            ).length
              ? []
              : [address],
          });
        }

        if (
          url === `${API}/customer/addresses/address-1` &&
          method === "DELETE"
        ) {
          return { ok: true, status: 204 };
        }

        throw new Error(`Unexpected request: ${method} ${url}`);
      },
    );

    render(<AddressesPage />);

    expect(await screen.findByText("123 Main Street")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByText("123 Main Street")).not.toBeInTheDocument();
    });

    expect(confirmSpy).toHaveBeenCalledWith("Delete this address?");
    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/customer/addresses/address-1`,
      expect.objectContaining({ method: "DELETE" }),
    );

    confirmSpy.mockRestore();
  });

  it("disables the save button while the create request is pending", async () => {
    let resolvePost: ((value: unknown) => void) | undefined;

    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === `${API}/customer/addresses` && method === "POST") {
          return new Promise((resolve) => {
            resolvePost = resolve;
          });
        }

        if (url === `${API}/customer/addresses` && method === "GET") {
          return Promise.resolve(jsonResponse({ addresses: [] }));
        }

        throw new Error(`Unexpected request: ${method} ${url}`);
      },
    );

    render(<AddressesPage />);

    fireEvent.click(await screen.findByRole("button", { name: /New address/i }));

    fireEvent.change(screen.getByLabelText("Street / Address"), {
      target: { value: "123 Main Street" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Ludhiana" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Address/i }));

    expect(await screen.findByRole("button", { name: /Save Address/i })).toBeDisabled();

    if (!resolvePost) {
      throw new Error("The create request was not started.");
    }

    await act(async () => {
      resolvePost!(jsonResponse({ address }));
    });

    await waitFor(() => {
      expect(screen.queryByRole("form", { name: "Address form" })).not.toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /New address/i })).toBeEnabled();
  });
});
