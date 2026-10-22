import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const PREFIX = "enc1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const INFO = "funnel-idempotency-seal-v1";

let ephemeral: string | undefined;

/** AES-256 key derived from ADMIN_KEY with its own HKDF info label. Without ADMIN_KEY (dev only) a per-process key is used, so sealed rows simply miss after a restart. */
function derive(adminKey: string | undefined): Buffer {
  const secret = adminKey || (ephemeral ??= randomBytes(32).toString("hex"));
  return Buffer.from(hkdfSync("sha256", secret, "", INFO, 32));
}

/** Seals a secret as `enc1:<base64url(iv | ciphertext | tag)>`. */
export function seal(plain: string, adminKey = process.env.ADMIN_KEY): string {
  const iv = randomBytes(IV_BYTES);
  const c = createCipheriv("aes-256-gcm", derive(adminKey), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return PREFIX + Buffer.concat([iv, body, c.getAuthTag()]).toString("base64url");
}

/** Returns the secret, or null when the value is not sealed, was tampered with, or the key changed. */
export function unseal(value: unknown, adminKey = process.env.ADMIN_KEY): string | null {
  if (typeof value !== "string" || !value.startsWith(PREFIX)) return null;
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64url");
    if (raw.length < IV_BYTES + TAG_BYTES) return null;
    const d = createDecipheriv("aes-256-gcm", derive(adminKey), raw.subarray(0, IV_BYTES));
    d.setAuthTag(raw.subarray(raw.length - TAG_BYTES));
    return Buffer.concat([d.update(raw.subarray(IV_BYTES, raw.length - TAG_BYTES)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
