import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Videos, thumbnails and uploads go to and from R2 over signed URLs. Task pictures must come from this site, R2 or a
// host listed in CSP_IMG_HOSTS (space separated, https only, for example "images.example.com *.cdn.example.com").
const extraImgHosts = (process.env.CSP_IMG_HOSTS ?? "")
  .split(/\s+/)
  .filter((h) => /^(\*\.)?[a-z0-9.-]+$/i.test(h))
  .map((h) => `https://${h}`);
// 'unsafe-inline' scripts stay because Next injects inline bootstrap scripts and no nonce is wired up.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${["'self'", "data:", "blob:", "https://*.r2.cloudflarestorage.com", ...extraImgHosts].join(" ")}`,
  "media-src 'self' blob: https://*.r2.cloudflarestorage.com",
  `connect-src 'self' https://*.r2.cloudflarestorage.com${isDev ? " ws: wss:" : ""}`,
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const baseHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Pages with tokens in the URL or private data never send a Referer.
      {
        source: "/:path((?:admin|api/admin|a/handoff)(?:/.*)?)",
        headers: [...baseHeaders, { key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/:path((?!admin(?:/|$)|api/admin(?:/|$)|a/handoff(?:/|$)).*)",
        headers: [...baseHeaders, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }],
      },
    ];
  },
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
