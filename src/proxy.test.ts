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
  it("allows same-origin writes and clients that send no origin", () => {
    expect(isCrossSiteMutation("POST", "https://app.example", "app.example", "same-origin")).toBe(false);
    expect(isCrossSiteMutation("POST", null, "app.example", null)).toBe(false);
  });
});

describe("proxy", () => {
  it("answers 404 without a cookie", () => {
    process.env.ADMIN_KEY = KEY;
    expect(proxy(req("/adminMatt")).status).toBe(404);
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
    expect(proxy(req("/adminMatt")).status).toBe(404);
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
    for (const path of ["/adminMatt", "/adminmatt", "/ADMINMATT/p/a"]) {
      expect(proxy(new NextRequest(`https://x.test${path}`)).status).toBe(404);
    }
    const cookie = `${ADMIN_COOKIE}=${cookieValue(KEY)}`;
    const res = proxy(new NextRequest("https://x.test/adminmatt", { headers: { cookie } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toContain("/adminMatt");
    expect(proxy(new NextRequest("https://x.test/adminmatt/k/abc")).headers.get("x-middleware-rewrite")).toContain("/adminMatt/k/abc");
  });
});
