/**
 * lib/api.ts — fetch client regression.
 *
 * Confirmed defect: `apiFetch` spread `...fetchInit` AFTER the merged
 * `headers` key. When a caller passed its own `headers` (or the request
 * carried a `signal`, which is part of `fetchInit`), the spread replaced the
 * merged `headers` object entirely — silently dropping both the
 * `Authorization: Bearer <token>` header and `Content-Type: application/json`.
 *
 * These tests lock in the corrected merge order and the abort-error helper.
 */
import { getAdminOrders, isAbortError, getHealth } from "../../lib/api";

const fetchMock = jest.fn();

describe("lib/api — request construction (regression)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (global as any).fetch = fetchMock;
  });

  const okResponse = (body: unknown) => ({
    ok: true,
    status: 200,
    json: async () => body,
  });

  it("sends the bearer token AND Content-Type together (merged headers)", async () => {
    window.localStorage.setItem("mpfo.accessToken", "token-abc");
    fetchMock.mockResolvedValue(okResponse({ total: 0, orders: [] }));

    await getAdminOrders({ limit: 5 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Authorization"]).toBe("Bearer token-abc");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("does not let a caller-supplied signal drop the auth headers", async () => {
    window.localStorage.setItem("mpfo.accessToken", "token-abc");
    fetchMock.mockResolvedValue(okResponse({ total: 0, orders: [] }));

    const ac = new AbortController();
    await getAdminOrders({ limit: 5 }, ac.signal);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.signal).toBe(ac.signal);
    expect(init.headers["Authorization"]).toBe("Bearer token-abc");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("merges caller-supplied headers with the defaults instead of replacing them", async () => {
    window.localStorage.setItem("mpfo.accessToken", "token-abc");
    fetchMock.mockResolvedValue(okResponse({ ok: true }));

    await getHealth();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Authorization"]).toBe("Bearer token-abc");
  });

  it("omits the Authorization header when there is no access token", async () => {
    fetchMock.mockResolvedValue(okResponse({ ok: true }));

    await getHealth();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Authorization"]).toBeUndefined();
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("forwards query params as a query string", async () => {
    fetchMock.mockResolvedValue(okResponse({ total: 0, orders: [] }));

    await getAdminOrders({ status: "PLACED", limit: 20, offset: 40 });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("status=PLACED");
    expect(url).toContain("limit=20");
    expect(url).toContain("offset=40");
  });
});

describe("lib/api — isAbortError", () => {
  it("recognises a DOMException AbortError", () => {
    const err = new DOMException("Aborted", "AbortError");
    expect(isAbortError(err)).toBe(true);
  });

  it("recognises a plain Error carrying name=AbortError", () => {
    const err = Object.assign(new Error("Aborted"), { name: "AbortError" });
    expect(isAbortError(err)).toBe(true);
  });

  it("does not treat a normal error as an abort", () => {
    expect(isAbortError(new Error("boom"))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
  });
});
