import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets parallel dev servers use separate build dirs. Defaults to .next.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
