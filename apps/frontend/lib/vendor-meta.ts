/**
 * Vendor Metadata & Editorial Brand Presets.
 *
 * Provides vibrant color gradients, brand monograms, curated taglines,
 * ratings, and category badges for marketplace vendors so directory and
 * showcase screens present a warm, luxury editorial aesthetic instead
 * of monochrome/wireframe cards.
 */

export interface VendorMeta {
  category: string;
  badge: string;
  tagline: string;
  rating: number;
  reviewsCount: number;
  established: string;
  gradient: string;
  emblemGradient: string;
  accentBadgeBg: string;
  accentBadgeText: string;
  highlights: string[];
  iconType: "tools" | "electronics" | "fashion" | "home" | "sports" | "default";
}

const VENDOR_PRESETS: Record<string, VendorMeta> = {
  "buildmaster tools": {
    category: "Tools & Industrial Hardware",
    badge: "Verified Master Builder",
    tagline: "Heavy-duty workshop tools, precision hardware, and industrial-grade equipment engineered for master artisans.",
    rating: 4.9,
    reviewsCount: 142,
    established: "Est. 2018",
    gradient: "from-[#854d0e] via-[#451a03] to-[#1c1917]",
    emblemGradient: "from-amber-500 to-amber-700",
    accentBadgeBg: "bg-amber-500/15 border-amber-500/30",
    accentBadgeText: "text-amber-800 dark:text-amber-300",
    highlights: ["Industrial Grade", "10-Yr Guarantee", "Ships in 24h"],
    iconType: "tools",
  },
  "electronics world": {
    category: "Audio & Smart Computing",
    badge: "Premier Tech Lab",
    tagline: "Studio-grade acoustics, high-precision computing peripherals, and next-generation smart lifestyle accessories.",
    rating: 4.8,
    reviewsCount: 215,
    established: "Est. 2020",
    gradient: "from-[#1e40af] via-[#0f172a] to-[#1e1b4b]",
    emblemGradient: "from-blue-600 to-indigo-700",
    accentBadgeBg: "bg-blue-500/15 border-blue-500/30",
    accentBadgeText: "text-blue-800 dark:text-blue-300",
    highlights: ["Audiophile Grade", "USB-C Fast Sync", "Ships in 24h"],
    iconType: "electronics",
  },
  "fashion forward": {
    category: "Luxury Apparel & Knitwear",
    badge: "Curated Atelier",
    tagline: "Ethically sourced merino wool, handcrafted denim, artisan leather accessories, and timeless wardrobe essentials.",
    rating: 4.9,
    reviewsCount: 320,
    established: "Est. 2019",
    gradient: "from-[#9f1239] via-[#292524] to-[#4c0519]",
    emblemGradient: "from-rose-600 to-rose-800",
    accentBadgeBg: "bg-rose-500/15 border-rose-500/30",
    accentBadgeText: "text-rose-800 dark:text-rose-300",
    highlights: ["100% Merino & Silk", "Hand-Finished", "Free Exchanges"],
    iconType: "fashion",
  },
  "home & kitchen co": {
    category: "Artisan Culinary & Living",
    badge: "Design Award '24",
    tagline: "Barista-grade coffee gear, forged Japanese steel knives, and warm aesthetic ceramics for the modern home.",
    rating: 4.9,
    reviewsCount: 184,
    established: "Est. 2017",
    gradient: "from-[#065f46] via-[#1c1917] to-[#022c22]",
    emblemGradient: "from-emerald-600 to-emerald-800",
    accentBadgeBg: "bg-emerald-500/15 border-emerald-500/30",
    accentBadgeText: "text-emerald-800 dark:text-emerald-300",
    highlights: ["Forged High-Carbon", "BPA Free", "Eco Packaging"],
    iconType: "home",
  },
  "sports gear inc": {
    category: "Endurance & Athletic Gear",
    badge: "Performance Certified",
    tagline: "High-performance training weights, endurance running gear, and ergonomic wellness accessories built to endure.",
    rating: 4.8,
    reviewsCount: 167,
    established: "Est. 2021",
    gradient: "from-[#c2410c] via-[#1c1917] to-[#7c2d12]",
    emblemGradient: "from-orange-600 to-orange-800",
    accentBadgeBg: "bg-orange-500/15 border-orange-500/30",
    accentBadgeText: "text-orange-800 dark:text-orange-300",
    highlights: ["Impact Tested", "Ergonomic Grip", "Ships in 24h"],
    iconType: "sports",
  },
};

/**
 * Returns editorial brand metadata for a vendor based on name keywords.
 * Falls back to a rich Ink Navy & Brass luxury palette for unknown merchants.
 */
export function getVendorMeta(name?: string | null): VendorMeta {
  if (!name) return getDefaultVendorMeta("Merchant");

  const key = name.toLowerCase().trim();

  for (const [presetKey, meta] of Object.entries(VENDOR_PRESETS)) {
    if (key.includes(presetKey) || presetKey.includes(key)) {
      return meta;
    }
  }

  // Keyword heuristic matching
  if (key.includes("tool") || key.includes("build") || key.includes("hardware")) {
    return VENDOR_PRESETS["buildmaster tools"];
  }
  if (key.includes("tech") || key.includes("electron") || key.includes("gadget")) {
    return VENDOR_PRESETS["electronics world"];
  }
  if (key.includes("cloth") || key.includes("apparel") || key.includes("fashion") || key.includes("wear")) {
    return VENDOR_PRESETS["fashion forward"];
  }
  if (key.includes("home") || key.includes("kitchen") || key.includes("cook")) {
    return VENDOR_PRESETS["home & kitchen co"];
  }
  if (key.includes("sport") || key.includes("gear") || key.includes("fit") || key.includes("outdoor")) {
    return VENDOR_PRESETS["sports gear inc"];
  }

  return getDefaultVendorMeta(name);
}

function getDefaultVendorMeta(name: string): VendorMeta {
  return {
    category: "Curated Independent Partner",
    badge: "Verified Merchant",
    tagline: `Hand-selected independent merchant offering authentic, high-grade specialty goods directly on Marketplace.`,
    rating: 4.8,
    reviewsCount: 96,
    established: "Est. 2022",
    gradient: "from-[#16233f] via-[#1e293b] to-[#0f172a]",
    emblemGradient: "from-amber-600 to-amber-800",
    accentBadgeBg: "bg-[var(--color-brass)]/15 border-[var(--color-brass)]/30",
    accentBadgeText: "text-[var(--color-accent)]",
    highlights: ["Verified Seller", "Buyer Protected", "Fast Dispatch"],
    iconType: "default",
  };
}
