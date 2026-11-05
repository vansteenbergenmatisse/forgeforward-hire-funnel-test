/**
 * A phone number that already finished this project's application gets a "shadow" session: it looks like a normal one
 * but nothing is saved (see server/shadow.ts). Its token starts with this prefix. Client safe, no secrets here.
 */
export const SHADOW_PREFIX = "shadow.";

export function isShadowToken(token: unknown): boolean {
  return typeof token === "string" && token.startsWith(SHADOW_PREFIX);
}
