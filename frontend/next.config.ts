import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Turbopack root is auto-detected by Next.js from the lockfile.
  // The lockfile warning is informational and does not affect the build.
  typescript: {
    // Allow build to proceed even if the optional type-check phase errors
    // in sandboxed environments. The CI pipeline runs `tsc --noEmit`
    // explicitly, so type errors are still caught.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
