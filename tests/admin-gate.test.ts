import { existsSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/adminMatt/k/[key]/route";
import { ADMIN_BASE_PATH } from "@/features/admin-access";
import { config, proxy } from "@/proxy";

const KEY = "a".repeat(48);

beforeAll(() => {
  process.env.ADMIN_KEY = KEY;
});

const keyCtx = (key: string) => ({ params: Promise.resolve({ key }) }) as never;

describe("admin gate", () => {
  it("serves the dashboard under /adminMatt", () => {
    expect(ADMIN_BASE_PATH).toBe("/adminMatt");
    expect(config.matcher).toEqual(["/adminMatt/:path*", "/api/admin/:path*"]);
  });

  it("wrong key gets 404, no cookie, and counts as a failed attempt", async () => {
    const ip = { headers: { "x-forwarded-for": "203.0.113.77" } };
    let res = await GET(new NextRequest("http://x/adminMatt/k/nope", ip), keyCtx("nope"));
    expect(res.status).toBe(404);
    expect(res.headers.get("set-cookie")).toBeNull();
    for (let i = 0; i < 20; i++) res = await GET(new NextRequest("http://x/adminMatt/k/nope", ip), keyCtx("nope"));
    // Too many failures from one address: even the right key is refused.
    res = await GET(new NextRequest(`http://x/adminMatt/k/${KEY}`, ip), keyCtx(KEY));
    expect(res.status).toBe(429);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("right key sets an httpOnly 30 day cookie and redirects to /adminMatt", async () => {
    const res = await GET(new NextRequest(`http://x/adminMatt/k/${KEY}`), keyCtx(KEY));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://x/adminMatt");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("ff_admin=");
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie).toContain("Path=/;");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(cookie).toContain(`Max-Age=${60 * 60 * 24 * 30}`);
  });

  it("proxy returns 404 on /adminMatt without the cookie and passes with it", async () => {
    expect(proxy(new NextRequest("http://x/adminMatt")).status).toBe(404);
    expect(proxy(new NextRequest("http://x/api/admin/projects")).status).toBe(404);
    const set = await GET(new NextRequest(`http://x/adminMatt/k/${KEY}`), keyCtx(KEY));
    const value = /ff_admin=([^;]+)/.exec(set.headers.get("set-cookie") ?? "")![1];
    const ok = proxy(new NextRequest("http://x/adminMatt", { headers: { cookie: `ff_admin=${value}` } }));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("x-robots-tag")).toContain("noindex");
    const api = proxy(new NextRequest("http://x/api/admin/projects", { headers: { cookie: `ff_admin=${value}` } }));
    expect(api.status).toBe(200);
  });

  it("the key route itself is reachable without a cookie", () => {
    expect(proxy(new NextRequest(`http://x/adminMatt/k/${KEY}`)).status).toBe(200);
  });

  it("the old /admin path has no page, no key route, and is outside the proxy matcher", () => {
    expect(existsSync("src/app/admin")).toBe(false);
    expect(config.matcher.some((m) => m.startsWith("/admin/"))).toBe(false);
  });
});
