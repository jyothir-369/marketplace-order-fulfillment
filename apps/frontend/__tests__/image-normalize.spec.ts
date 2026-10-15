import { describe, it, expect } from "@jest/globals";
import { normalizeProductImages } from "@/lib/image-normalize";

describe("normalizeProductImages", () => {
  it("returns empty array for null/undefined", () => {
    expect(normalizeProductImages(null)).toEqual([]);
    expect(normalizeProductImages(undefined)).toEqual([]);
  });

  it("parses array of URLs and preserves order, removes duplicates", () => {
    const input = [
      "https://images.unsplash.com/photo-1",
      "https://images.unsplash.com/photo-2",
      "https://images.unsplash.com/photo-1",
    ];
    expect(normalizeProductImages(input)).toEqual([
      "https://images.unsplash.com/photo-1",
      "https://images.unsplash.com/photo-2",
    ]);
  });

  it("handles single URL string", () => {
    expect(normalizeProductImages("https://picsum.photos/200")).toEqual([
      "https://picsum.photos/200",
    ]);
  });

  it("handles comma-separated string", () => {
    expect(normalizeProductImages("https://a,https://b")).toEqual([
      "https://a",
      "https://b",
    ]);
  });

  it("strips whitespace and skips empty entries", () => {
    expect(normalizeProductImages(["  ", "https://ok"])).toEqual([
      "https://ok",
    ]);
  });

  it("rejects non-http schemes", () => {
    expect(normalizeProductImages(["javascript:alert(1)", "https://safe"])).toEqual([
      "https://safe",
    ]);
  });

  it("skips invalid URLs", () => {
    expect(normalizeProductImages(["not a url", "https://good"])).toEqual([
      "https://good",
    ]);
  });
});
