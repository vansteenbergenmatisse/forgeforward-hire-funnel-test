const IN_APP_PATTERN = /FBAN|FBAV|Instagram|TikTok|Bytedance|LinkedInApp|Line\//i;

/** True when the user agent belongs to a social app's built-in browser. */
export function detectInAppBrowser(userAgent: string): boolean {
  return IN_APP_PATTERN.test(userAgent);
}

export function isAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

/** Android intent link that opens the given page in Chrome. Returns null for non http(s) urls. */
export function buildChromeIntentUrl(pageUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const scheme = url.protocol.slice(0, -1);
  const rest = `${url.host}${url.pathname}${url.search}${url.hash}`;
  return `intent://${rest}#Intent;scheme=${scheme};package=com.android.chrome;end`;
}
