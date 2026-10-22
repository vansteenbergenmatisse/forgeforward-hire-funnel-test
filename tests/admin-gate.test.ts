import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/admin/k/[key]/route";
import { proxy } from "@/proxy";

const KEY = "a".repeat(48);

beforeAll(() => {
  process.env.ADMIN_KEY = KEY;
});

const keyCtx = (key: string) => ({ params: Promise.resolve({ key }) }) as never;

describe("admin gate", () => {
  it("wrong key gets 404 and no cookie", async () => {
    const res = await GET(new NextRequest("http://x/admin/k/nope"), keyCtx("nope"));
    expect(res.status).toBe(404);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("right key sets an httpOnly 30 day cookie and redirects to /admin", async () => {
    const res = await GET(new NextRequest(`http://x/admin/k/${KEY}`), keyCtx(KEY));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://x/admin");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("ff_admin=");
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(cookie).toContain(`Max-Age=${60 * 60 * 24 * 30}`);
  });

  it("proxy returns 404 on /admin without the cookie and passes with it", async () => {
    expect(proxy(new NextRequest("http://x/admin")).status).toBe(404);
    expect(proxy(new NextRequest("http://x/api/admin/projects")).status).toBe(404);
    const set = await GET(new NextRequest(`http://x/admin/k/${KEY}`), keyCtx(KEY));
    const value = /ff_admin=([^;]+)/.exec(set.headers.get("set-cookie") ?? "")![1];
    const ok = proxy(new NextRequest("http://x/admin", { headers: { cookie: `ff_admin=${value}` } }));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("the key route itself is reachable without a cookie", () => {
    expect(proxy(new NextRequest(`http://x/admin/k/${KEY}`)).status).toBe(200);
  });
});
