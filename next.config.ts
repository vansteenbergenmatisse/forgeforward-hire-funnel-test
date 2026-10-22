import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets parallel dev servers use separate build dirs. Defaults to .next.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // The test console upload check reads this file at run time, so the serverless trace must carry it.
  outputFileTracingIncludes: {
    "/api/admin/test/check": ["./test-assets/sample.webm"],
  },
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
