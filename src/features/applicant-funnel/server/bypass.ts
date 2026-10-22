import { createHmac, timingSafeEqual } from "node:crypto";

export const TEST_CONSOLE_HEADER = "x-test-console";
/** The console signs a fresh header per request, so the window only has to cover clock skew and transit. */
const MAX_AGE_MS = 30_000;

/** Purpose-bound subkey, so ADMIN_KEY is never used directly as an HMAC key for the bypass. */
function subkey(adminKey: string) {
  return createHmac("sha256", adminKey).update("funnel-test-console-key-v1").digest();
}

function mac(adminKey: string, ts: string) {
  return createHmac("sha256", subkey(adminKey)).update(`test-console-v1:${ts}`).digest("hex");
}

/** Header value the test console sends: `<unix ms>.<hmac>`. */
export function signTestConsole(adminKey: string, now = Date.now()): string {
  const ts = String(now);
  return `${ts}.${mac(adminKey, ts)}`;
}

export function isTestConsole(value: string | null, adminKey: string | undefined, now = Date.now()): boolean {
  if (!value || !adminKey) return false;
  const [ts, sig] = value.split(".");
  if (!ts || !sig || !/^\d{10,16}$/.test(ts)) return false;
  if (Math.abs(now - Number(ts)) > MAX_AGE_MS) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(mac(adminKey, ts));
  return a.length === b.length && timingSafeEqual(a, b);
}
