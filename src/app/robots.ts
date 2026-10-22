import type { MetadataRoute } from "next";

// No private paths are listed here: that would publish where the admin area lives.
// The admin gate answers 404 and sends X-Robots-Tag noindex.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" } };
}
