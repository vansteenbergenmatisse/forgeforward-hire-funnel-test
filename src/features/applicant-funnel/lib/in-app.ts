const IN_APP_PATTERN =
  /FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|Bytedance|LinkedInApp|Line\/|Snapchat|Pinterest|MicroMessenger|Twitter|Messenger|GSA\/|;\s?wv\)/i;

/**
 * True when the user agent belongs to a social app's built-in browser.
 * Also catches generic WebViews: Android adds "wv" to them, and iOS WebViews leave out "Safari/".
 */
export function detectInAppBrowser(userAgent: string): boolean {
  if (IN_APP_PATTERN.test(userAgent)) return true;
  return /\b(iPhone|iPad|iPod)\b/.test(userAgent) && /AppleWebKit/i.test(userAgent) && !/Safari\//i.test(userAgent);
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
