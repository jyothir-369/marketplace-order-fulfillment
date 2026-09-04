import type { NextConfig } from "next";
import path from "path";

/**
 * next.config.ts
 *
 * Turbopack workspace fix: Next.js 16 with Turbopack detects multiple
 * lockfiles in monorepos (root package-lock.json + frontend/package-lock.json).
 * Explicitly set turbopack.root to the frontend package root
 * so Turbopack ignores the repo root lockfile and uses only the frontend one.
 * In Next.js 16 the `turbopack` key moved out of `experimental` to the top
 * level of the config.
 *
 * NOTE: next.config.ts is always compiled as CommonJS by Next.js regardless of
 * the project'"'"'s module type, so we use `process.cwd()` instead of
 * `import.meta.url` / `__dirname` (ESM-only APIs).
 *
 * References:
 *   - https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack
 */
const nextConfig: NextConfig = {
  // Tell Turbopack to treat the frontend/ directory as the workspace root.
  // This prevents the "multiple lockfiles detected" panic from Next.js 16.
  turbopack: {
    root: process.cwd(),
  },

  typescript: {
    // ignoreBuildErrors is false — type errors are caught by CI via `tsc --noEmit`.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
