/**
 * lib/catalog-options.ts - shared catalog filter/sort options.
 *
 * Kept out of page modules because Next.js page files may only export route
 * segment config (default, metadata, generateStaticParams, ...). Exporting
 * arbitrary values from a page breaks the typed production build.
 */

export const CATEGORY_TABS = [
  { value: "",              label: "All" },
  { value: "Electronics",  label: "Electronics" },
  { value: "Apparel",      label: "Apparel" },
  { value: "Home & Living",label: "Home & Living" },
  { value: "Industrial",   label: "Industrial" },
] as const;

export const SORT_OPTIONS = [
  { value: "",            label: "Featured"          },
  { value: "price-asc",   label: "Price: Low > High" },
  { value: "price-desc",  label: "Price: High > Low" },
  { value: "newest",      label: "Newest"             },
] as const;