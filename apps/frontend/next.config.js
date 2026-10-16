const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
    unoptimized: true,
  },
  typescript: { ignoreBuildErrors: false },
};

module.exports = nextConfig;
