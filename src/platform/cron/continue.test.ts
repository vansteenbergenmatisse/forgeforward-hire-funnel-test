import { describe, expect, it } from "vitest";
import { continuationUrl } from "./continue";

describe("continuationUrl", () => {
  it("uses APP_URL as the origin and keeps path and query", () => {
    const req = new Request("https://evil.example/api/cron/retention?dryRun=0");
    const url = continuationUrl(req, "c1", "https://apply.forgeforward.io");
    expect(url.origin).toBe("https://apply.forgeforward.io");
    expect(url.pathname).toBe("/api/cron/retention");
    expect(url.searchParams.get("after")).toBe("c1");
    expect(url.searchParams.get("dryRun")).toBe("0");
  });
  it("replaces an earlier cursor", () => {
    const req = new Request("https://x.example/api/cron/integrity?after=old");
    expect(continuationUrl(req, "new", "https://a.example").searchParams.getAll("after")).toEqual(["new"]);
  });
  it("falls back to the request origin when APP_URL is not set", () => {
    const req = new Request("https://x.example/api/cron/integrity");
    expect(continuationUrl(req, "n", undefined).origin).toBe("https://x.example");
  });
});
