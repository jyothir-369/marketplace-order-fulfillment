import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // CRITICAL: tell Next.js the trace root is the monorepo root, not apps/frontend.
  // This is what unblocks Turbopack's `next/package.json` resolution on Vercel.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  // Allow Unsplash product images.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
    unoptimized: true,
  },

  // Do not fail builds on lint warnings during PR previews.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;