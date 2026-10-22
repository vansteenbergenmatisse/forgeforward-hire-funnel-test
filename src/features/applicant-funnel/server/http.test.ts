import { describe, expect, it } from "vitest";
import { readJson } from "./http";
import { clientIp, ipBucket } from "./rate-limit";

const post = (body: string, headers: Record<string, string> = { "content-type": "application/json" }) =>
  new Request("http://x/api", { method: "POST", headers, body });

describe("readJson", () => {
  it("parses a JSON body and an empty body", async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 });
    expect(await readJson(post(""))).toEqual({});
  });
  it("refuses other content types", async () => {
    await expect(readJson(post("{}", { "content-type": "text/plain" }))).rejects.toMatchObject({ status: 415 });
    await expect(readJson(post("{}", {}))).rejects.toMatchObject({ status: 415 });
  });
  it("counts bytes, not characters, and stops big bodies", async () => {
    const wide = JSON.stringify({ t: "é".repeat(40_000) }); // 40k characters, 80k bytes
    await expect(readJson(post(wide))).rejects.toMatchObject({ status: 413 });
  });
  it("answers 400 for broken JSON", async () => {
    await expect(readJson(post("{nope"))).rejects.toMatchObject({ status: 400 });
  });
});

describe("clientIp and ipBucket", () => {
  const req = (h: Record<string, string>) => new Request("http://x", { headers: h });
  it("prefers the platform header and ignores the leftmost forwarded entry", () => {
    expect(clientIp(req({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "9.9.9.9, 2.2.2.2" }))).toBe("1.1.1.1");
    expect(clientIp(req({ "x-forwarded-for": "9.9.9.9, 2.2.2.2" }))).toBe("2.2.2.2");
    expect(clientIp(req({}))).toBe("unknown");
  });
  it("hashes per scope and per day", () => {
    const d1 = new Date("2026-01-01T10:00:00Z");
    const d2 = new Date("2026-01-02T10:00:00Z");
    expect(ipBucket("a", "1.1.1.1", d1)).toBe(ipBucket("a", "1.1.1.1", d1));
    expect(ipBucket("a", "1.1.1.1", d1)).not.toBe(ipBucket("a", "1.1.1.1", d2));
    expect(ipBucket("a", "1.1.1.1", d1)).not.toBe(ipBucket("b", "1.1.1.1", d1));
    expect(ipBucket("a", "1.1.1.1", d1)).not.toContain("1.1.1.1");
  });
});
