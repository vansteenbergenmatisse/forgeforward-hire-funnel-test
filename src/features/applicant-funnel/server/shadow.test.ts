import { describe, expect, it } from "vitest";
import { SLUG_MAX } from "@/features/projects/slug";
import { makeShadowToken, readShadowToken, shadowKeyDir } from "./shadow";

const KEY = "k".repeat(48);

describe("shadow tokens", () => {
  it("round trips the slug for the right kind", () => {
    const t = makeShadowToken("resume", "appointment-setter", undefined, KEY);
    expect(t.startsWith("shadow.")).toBe(true);
    expect(readShadowToken(t, "resume", KEY)?.slug).toBe("appointment-setter");
  });
  it("is not accepted as the other kind", () => {
    const t = makeShadowToken("resume", "a", undefined, KEY);
    expect(readShadowToken(t, "handoff", KEY)).toBeNull();
  });
  it("rejects a changed slug, a changed signature and another key", () => {
    const t = makeShadowToken("resume", "role-a", undefined, KEY);
    const [prefix, payload, sig] = t.split(".");
    const forged = Buffer.from(Buffer.from(payload, "base64url").toString().replace("role-a", "role-b")).toString("base64url");
    expect(readShadowToken(`${prefix}.${forged}.${sig}`, "resume", KEY)).toBeNull();
    expect(readShadowToken(`${prefix}.${payload}.${sig.slice(1)}x`, "resume", KEY)).toBeNull();
    expect(readShadowToken(t, "resume", "z".repeat(48))).toBeNull();
  });
  it("never reads a real resume token or junk as a shadow token", () => {
    expect(readShadowToken("abcDEF_-123456789012345678", "resume", KEY)).toBeNull();
    expect(readShadowToken("shadow.", "resume", KEY)).toBeNull();
    expect(readShadowToken("shadow.a.b.c.d", "resume", KEY)).toBeNull();
  });
  it("expires a handoff token", () => {
    const t = makeShadowToken("handoff", "a", 1_000, KEY, 10_000);
    expect(readShadowToken(t, "handoff", KEY, 10_500)?.slug).toBe("a");
    expect(readShadowToken(t, "handoff", KEY, 11_001)).toBeNull();
  });
  it("stays under the 200 character limit of the API for the longest allowed slug", () => {
    const t = makeShadowToken("handoff", "x".repeat(SLUG_MAX), 30 * 60_000, KEY);
    expect(t.length).toBeLessThanOrEqual(200);
  });
  it("gives each token its own storage folder under shadow/", () => {
    const a = makeShadowToken("resume", "s", undefined, KEY);
    const b = makeShadowToken("resume", "s", undefined, KEY);
    const dirA = shadowKeyDir("videos", readShadowToken(a, "resume", KEY)!);
    expect(dirA).toContain("shadow/videos/s/");
    expect(dirA).not.toBe(shadowKeyDir("videos", readShadowToken(b, "resume", KEY)!));
  });
});
