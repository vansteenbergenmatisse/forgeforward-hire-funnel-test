import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ADMIN_COOKIE, cookieValue } from "@/features/admin-access/access";
import { canonicalAdminPath, isCrossSiteMutation, proxy } from "./proxy";

const KEY = "k".repeat(48);
const prev = process.env.ADMIN_KEY;
afterEach(() => {
  if (prev === undefined) delete process.env.ADMIN_KEY;
  else process.env.ADMIN_KEY = prev;
});

function req(path: string, init: { method?: string; headers?: Record<string, string>; cookie?: string } = {}) {
  const headers = new Headers({ host: "app.example", ...init.headers });
  if (init.cookie) headers.set("cookie", `${ADMIN_COOKIE}=${init.cookie}`);
  return new NextRequest(`https://app.example${path}`, { method: init.method ?? "GET", headers });
}

describe("isCrossSiteMutation", () => {
  it("never blocks reads", () => {
    expect(isCrossSiteMutation("GET", "https://evil.example", "app.example", "cross-site")).toBe(false);
  });
  it("blocks a write from another origin or site", () => {
    expect(isCrossSiteMutation("POST", "https://evil.example", "app.example", null)).toBe(true);
    expect(isCrossSiteMutation("DELETE", null, "app.example", "cross-site")).toBe(true);
    expect(isCrossSiteMutation("POST", "not a url", "app.example", null)).toBe(true);
  });
  it("allows a same-origin post that carries Origin: null", () => {
    expect(isCrossSiteMutation("POST", "null", "app.example", "same-origin")).toBe(false);
    expect(isCrossSiteMutation("POST", "null", "app.example", null)).toBe(true);
  });
  it("allows same-origin writes and clients that send no origin", () => {
    expect(isCrossSiteMutation("POST", "https://app.example", "app.example", "same-origin")).toBe(false);
    expect(isCrossSiteMutation("POST", null, "app.example", null)).toBe(false);
  });
});

describe("proxy", () => {
  it("answers 404 without a cookie", () => {
    process.env.ADMIN_KEY = KEY;
    expect(proxy(req("/adminMatt/test")).status).toBe(404);
  });
  it("lets a valid cookie through with noindex", () => {
    process.env.ADMIN_KEY = KEY;
    const res = proxy(req("/adminMatt", { cookie: cookieValue(KEY) }));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
  });
  it("rejects a cross-site write even with a valid cookie", () => {
    process.env.ADMIN_KEY = KEY;
    const res = proxy(
      req("/api/admin/stages", { method: "POST", cookie: cookieValue(KEY), headers: { origin: "https://evil.example" } }),
    );
    expect(res.status).toBe(403);
  });
  it("fails closed when the admin key is short or missing", () => {
    const short = "s".repeat(31);
    process.env.ADMIN_KEY = short;
    expect(proxy(req("/adminMatt", { cookie: cookieValue(short) })).status).toBe(404);
    expect(proxy(req("/adminMatt/k/anything")).status).toBe(404);
    delete process.env.ADMIN_KEY;
    expect(proxy(req("/adminMatt/test")).status).toBe(404);
  });
});


describe("admin path in any letter case", () => {
  it("maps other cases to the canonical path and leaves it alone otherwise", () => {
    expect(canonicalAdminPath("/adminmatt")).toBe("/adminMatt");
    expect(canonicalAdminPath("/ADMINMATT/p/x")).toBe("/adminMatt/p/x");
    expect(canonicalAdminPath("/adminMatt")).toBeNull();
    expect(canonicalAdminPath("/adminMatt/k/abc")).toBeNull();
    expect(canonicalAdminPath("/adminmattx")).toBeNull();
    expect(canonicalAdminPath("/admin")).toBeNull();
  });

  it("answers 404 for every spelling without the cookie, and serves the page with it", () => {
    process.env.ADMIN_KEY = KEY;
    for (const path of ["/adminMatt/p/a", "/adminmatt/test", "/ADMINMATT/p/a"]) {
      expect(proxy(new NextRequest(`https://x.test${path}`)).status).toBe(404);
    }
    const cookie = `${ADMIN_COOKIE}=${cookieValue(KEY)}`;
    const res = proxy(new NextRequest("https://x.test/adminmatt", { headers: { cookie } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toContain("/adminMatt");
    expect(proxy(new NextRequest("https://x.test/adminmatt/k/abc")).headers.get("x-middleware-rewrite")).toContain("/adminMatt/k/abc");
  });
});

describe("password login routes", () => {
  const url = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest(`https://x.test${path}`, init);
  const withCookie = () => ({ headers: { cookie: `${ADMIN_COOKIE}=${cookieValue(KEY)}` } });

  it("rewrites the dashboard address and the login page to the login page without the cookie", () => {
    process.env.ADMIN_KEY = KEY;
    for (const path of ["/adminMatt", "/adminMatt/", "/adminmatt", "/ADMINMATT/", "/adminMatt/login", "/adminMatt/login/", "/adminmatt/login"]) {
      const res = proxy(url(path));
      expect(res.status, path).toBe(200);
      expect(res.headers.get("x-middleware-rewrite"), path).toContain("/adminMatt/login");
      expect(res.headers.get("x-robots-tag"), path).toContain("noindex");
    }
  });

  it("keeps every other admin path and the admin API at 404 without the cookie", () => {
    process.env.ADMIN_KEY = KEY;
    for (const path of ["/adminMatt/p/a", "/adminMatt/test", "/adminMatt/logout", "/adminMatt/login/x", "/adminMatt/loginx", "/api/admin/projects"]) {
      expect(proxy(url(path)).status, path).toBe(404);
    }
    expect(proxy(url("/adminMatt/login/submit")).status).toBe(404);
    expect(proxy(url("/adminMatt", { method: "POST" })).status).toBe(404);
    expect(proxy(url("/adminMatt/login", { method: "POST" })).status).toBe(404);
  });

  it("still lets the key link through", () => {
    process.env.ADMIN_KEY = KEY;
    expect(proxy(url("/adminMatt/k/abc")).status).toBe(200);
  });

  it("redirects the login page to the dashboard with a valid cookie", () => {
    process.env.ADMIN_KEY = KEY;
    for (const path of ["/adminMatt/login", "/adminmatt/login/"]) {
      const res = proxy(url(path, withCookie()));
      expect(res.status, path).toBe(307);
      expect(new URL(res.headers.get("location") as string).pathname).toBe("/adminMatt");
    }
    expect(proxy(url("/adminMatt", withCookie())).status).toBe(200);
  });

  it("accepts a same-origin login post and refuses a cross-site one", () => {
    process.env.ADMIN_KEY = KEY;
    const post = (headers: Record<string, string>) => proxy(url("/adminMatt/login/submit", { method: "POST", headers: { host: "x.test", ...headers } }));
    expect(post({ origin: "https://x.test", "sec-fetch-site": "same-origin" }).status).toBe(200);
    expect(post({ origin: "https://evil.example" }).status).toBe(403);
    expect(post({ "sec-fetch-site": "cross-site" }).status).toBe(403);
  });

  it("fails closed when the admin key is short, login page included", () => {
    process.env.ADMIN_KEY = "s".repeat(31);
    expect(proxy(url("/adminMatt")).status).toBe(404);
    expect(proxy(url("/adminMatt/login")).status).toBe(404);
  });
});
