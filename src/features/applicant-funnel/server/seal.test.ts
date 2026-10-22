import { describe, expect, it } from "vitest";
import { seal, unseal } from "./seal";
import { startCodec } from "./start";

const KEY = "k".repeat(48);

describe("seal", () => {
  it("round-trips and does not contain the plaintext", () => {
    const s = seal("tok-abc", KEY);
    expect(s.startsWith("enc1:")).toBe(true);
    expect(s).not.toContain("tok-abc");
    expect(unseal(s, KEY)).toBe("tok-abc");
  });
  it("uses a fresh IV each time", () => {
    expect(seal("x", KEY)).not.toBe(seal("x", KEY));
  });
  it("fails on tampering", () => {
    const s = seal("tok-abc", KEY);
    const body = s.slice(5);
    const flipped = body.slice(0, 20) + (body[20] === "A" ? "B" : "A") + body.slice(21);
    expect(unseal("enc1:" + flipped, KEY)).toBeNull();
    expect(unseal(s.slice(0, -4), KEY)).toBeNull();
  });
  it("fails with the wrong key and on plaintext or junk", () => {
    expect(unseal(seal("tok-abc", KEY), "z".repeat(48))).toBeNull();
    expect(unseal("plain-token", KEY)).toBeNull();
    expect(unseal("enc1:", KEY)).toBeNull();
    expect(unseal(undefined, KEY)).toBeNull();
  });
  it("start codec hides the token and refuses legacy plaintext", () => {
    process.env.ADMIN_KEY = KEY;
    const stored = startCodec.seal({ applicant_id: "a1", resume_token: "tok-abc" });
    expect(JSON.stringify(stored)).not.toContain("tok-abc");
    expect(startCodec.open(stored)).toEqual({ applicant_id: "a1", resume_token: "tok-abc" });
    expect(startCodec.open({ applicant_id: "a1", resume_token: "tok-abc" })).toBeNull();
  });
});
