import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, like } from "drizzle-orm";

const haveDb = Boolean(process.env.TEST_DATABASE_URL);
if (haveDb) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const KEY = "k".repeat(48);
const PW = "db-test-password";

describe.skipIf(!haveDb)("attemptLogin limiter", () => {
  const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
  const req = { headers: new Headers({ "x-real-ip": ip }) };
  let bucket = "";

  beforeAll(async () => {
    process.env.ADMIN_KEY = KEY;
    process.env.ADMIN_PASSWORD = PW;
    const { loginBucket } = await import("./login");
    bucket = loginBucket(ip, KEY);
  });

  afterAll(async () => {
    const { closeDb, db, tables } = await import("@/platform/db");
    await db().delete(tables.rateLimitHits).where(eq(tables.rateLimitHits.bucket, bucket));
    await db().delete(tables.adminAudit).where(eq(tables.adminAudit.action, "admin.login"));
    await db().delete(tables.systemErrors).where(like(tables.systemErrors.source, "admin.login"));
    await closeDb();
  });

  it("blocks after 8 failures, successes do not count, and a block refuses even the right password", async () => {
    const { attemptLogin, LOGIN_MAX_FAILURES } = await import("./login");
    const { db, tables } = await import("@/platform/db");
    for (let i = 0; i < 5; i++) expect(await attemptLogin(req, PW)).toEqual({ ok: true });
    const hits = () => db().select().from(tables.rateLimitHits).where(eq(tables.rateLimitHits.bucket, bucket));
    expect(await hits()).toHaveLength(0);

    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) expect(await attemptLogin(req, "nope")).toEqual({ ok: false, reason: "wrong" });
    expect(await attemptLogin(req, "nope")).toEqual({ ok: false, reason: "limited" });
    expect(await attemptLogin(req, PW)).toEqual({ ok: false, reason: "limited" });
    expect(await hits()).toHaveLength(LOGIN_MAX_FAILURES);

    const audit = await db().select().from(tables.adminAudit).where(eq(tables.adminAudit.action, "admin.login"));
    expect(audit.length).toBeGreaterThanOrEqual(5);
    expect(JSON.stringify(audit)).not.toContain(PW);
    expect(JSON.stringify(audit)).not.toContain(ip);
  }, 60_000);

  it("lets the same address try again once the window has passed", async () => {
    const { attemptLogin, LOGIN_WINDOW_MS } = await import("./login");
    const later = new Date(Date.now() + LOGIN_WINDOW_MS + 1000);
    expect(await attemptLogin(req, PW, later)).toEqual({ ok: true });
  });

  it("is off when no password is set", async () => {
    const { attemptLogin } = await import("./login");
    delete process.env.ADMIN_PASSWORD;
    expect(await attemptLogin(req, "")).toEqual({ ok: false, reason: "disabled" });
    expect(await attemptLogin(req, PW)).toEqual({ ok: false, reason: "disabled" });
    process.env.ADMIN_PASSWORD = "";
    expect(await attemptLogin(req, "")).toEqual({ ok: false, reason: "disabled" });
    process.env.ADMIN_PASSWORD = PW;
  });
});
