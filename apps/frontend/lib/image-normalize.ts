/**
 * Normalizes product image URLs from the backend DTO format.
 * Handles: array of URLs, single URL string, null/undefined, whitespace.
 * Preserves order, removes duplicates, rejects unsafe schemes.
 */
export function normalizeProductImages(
  images?: string[] | null | string,
): string[] {
  if (!images) return [];
  let arr: string[];
  if (Array.isArray(images)) {
    arr = images;
  } else if (typeof images === "string") {
    // Handle comma-separated or single string
    arr = images.includes(",") ? images.split(",") : [images];
  } else {
    return [];
  }
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const raw of arr) {
    const url = raw.trim();
    if (!url) continue;
    // Only allow http/https; reject data:, javascript:, file:, etc.
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
    } catch {
      // Not a valid absolute URL; skip
      continue;
    }
    if (!seen.has(url)) {
      seen.add(url);
      cleaned.push(url);
    }
  }
  return cleaned;
}
