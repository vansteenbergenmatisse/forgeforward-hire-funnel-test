export type DeviceKind = "iphone" | "android" | "desktop";

/**
 * Picks which "camera blocked" help to show first. Pure so it can be tested.
 * iPadOS 13+ Safari reports a Mac user agent, so a Mac with a touch screen is an iPad.
 */
export function detectDevice(ua: string, maxTouchPoints = 0): DeviceKind {
  if (/iPhone|iPad|iPod/i.test(ua)) return "iphone";
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return "iphone";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}
