/**
 * Turns user input into a safe absolute URL, or null.
 * "example.com/a" becomes https://example.com/a. Only the listed protocols are allowed.
 */
export function normalizeUrl(raw: string, protocols: readonly string[] = ["http:", "https:"]): string | null {
  const v = raw.trim();
  if (v === "" || /\s/.test(v)) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(v);
  const withScheme = hasScheme && !/^[a-z0-9.-]+:\d+/i.test(v) ? v : `https://${v}`;
  try {
    const url = new URL(withScheme);
    if (!protocols.includes(url.protocol)) return null;
    if ((url.protocol === "http:" || url.protocol === "https:") && !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const LINK_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"] as const;
