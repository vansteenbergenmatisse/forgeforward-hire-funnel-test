import { describe, expect, it } from "vitest";
import { GET as retention } from "./retention/route";
import { GET as integrity } from "./integrity/route";

process.env.CRON_SECRET = "c".repeat(40);

describe.each([
  ["retention", retention],
  ["integrity", integrity],
])("/api/cron/%s auth", (_name, handler) => {
  it("answers 401 without a header", async () => {
    expect((await handler(new Request("http://localhost/api/cron/x"))).status).toBe(401);
  });
  it("answers 401 with a wrong token", async () => {
    const req = new Request("http://localhost/api/cron/x", { headers: { authorization: `Bearer ${"d".repeat(40)}` } });
    expect((await handler(req)).status).toBe(401);
  });
  it("answers 400 for a bad query once authorised", async () => {
    const req = new Request("http://localhost/api/cron/x?after=not-a-uuid", { headers: { authorization: `Bearer ${"c".repeat(40)}` } });
    expect((await handler(req)).status).toBe(400);
  });
});
