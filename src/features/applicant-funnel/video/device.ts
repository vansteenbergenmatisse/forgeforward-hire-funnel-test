export type DeviceKind = "iphone" | "android" | "desktop";

/** Picks which "camera blocked" help to show first. Pure so it can be tested. */
export function detectDevice(ua: string): DeviceKind {
  if (/iPhone|iPad|iPod/i.test(ua)) return "iphone";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}
