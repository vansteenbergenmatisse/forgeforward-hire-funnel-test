const CAL_HOSTS = ["cal.com", "cal.eu"];

/** cal.com, cal.eu and their subdomains, plus self-hosted hosts listed in NEXT_PUBLIC_CAL_HOSTS (comma separated). */
function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const extra = (process.env.NEXT_PUBLIC_CAL_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return [...CAL_HOSTS, ...extra].some((h) => host === h || host.endsWith(`.${h}`));
}

/**
 * Accepts "cal.com/team/event" and full https URLs. Returns the https URL, or null when it is not a Cal.com link.
 * The link gets the applicant's name, email and id added, so plain http and unknown hosts are refused.
 */
export function normalizeCalLink(raw: string): string | null {
  const v = raw.trim();
  if (v === "") return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (!isAllowedHost(url.hostname)) return null;
    if (url.pathname.replace(/\//g, "") === "") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
