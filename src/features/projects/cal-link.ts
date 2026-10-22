/** Accepts "cal.com/team/event" and full URLs. Returns the https URL, or null when it is not a Cal.com style link. */
export function normalizeCalLink(raw: string): string | null {
  const v = raw.trim();
  if (v === "") return null;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    if (url.pathname.replace(/\//g, "") === "") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
