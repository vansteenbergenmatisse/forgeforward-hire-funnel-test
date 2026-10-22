import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

const haveDb = Boolean(process.env.TEST_DATABASE_URL);
if (haveDb) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!haveDb)("once() with a dead request", () => {
  const route = `idem-test-${crypto.randomUUID().slice(0, 8)}`;

  afterAll(async () => {
    const { closeDb, db, tables } = await import("@/platform/db");
    await db().delete(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.route, route));
    await closeDb();
  });

  it("takes over a claim that never got a response, and prunes old keys", async () => {
    const { db, tables } = await import("@/platform/db");
    const { once, pruneIdempotencyKeys } = await import("./idempotency");
    const old = new Date(Date.now() - 60_000);
    await db().insert(tables.idempotencyKeys).values({ key: `${route}:k1`, route, createdAt: old });
    expect(await once(route, "k1", async () => ({ ok: 1 }))).toEqual({ ok: 1 });
    expect(await once(route, "k1", async () => ({ ok: 2 }))).toEqual({ ok: 1 });

    await db().insert(tables.idempotencyKeys).values({ key: `${route}:k2`, route, response: { a: 1 }, createdAt: new Date(Date.now() - 2 * 86_400_000) });
    expect(await pruneIdempotencyKeys()).toBeGreaterThanOrEqual(1);
    const left = await db().select().from(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.key, `${route}:k2`));
    expect(left).toHaveLength(0);
  });

  it("with a codec: stores no plaintext, replays the same token, and misses on legacy or tampered rows", async () => {
    const { db, tables } = await import("@/platform/db");
    const { once } = await import("./idempotency");
    const { seal, unseal } = await import("./seal");
    process.env.ADMIN_KEY = "a".repeat(48);
    const codec = {
      seal: (r: { t: string }) => ({ t: seal(r.t) }),
      open: (s: unknown) => {
        const t = unseal((s as { t?: unknown } | null)?.t);
        return t ? { t } : null;
      },
    };
    let runs = 0;
    const work = async () => ({ t: `secret-${++runs}` });
    const first = await once(route, "c1", work, codec);
    const [row] = await db().select().from(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.key, `${route}:c1`));
    expect(JSON.stringify(row.response)).not.toContain(first.t);
    expect(await once(route, "c1", work, codec)).toEqual(first);
    expect(runs).toBe(1);

    await db().update(tables.idempotencyKeys).set({ response: { t: "legacy-plain" } }).where(eq(tables.idempotencyKeys.key, `${route}:c1`));
    const again = await once(route, "c1", work, codec);
    expect(again.t).toBe("secret-2");
    expect(runs).toBe(2);
    const [row2] = await db().select().from(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.key, `${route}:c1`));
    expect(JSON.stringify(row2.response)).not.toContain("secret-2");
  });
});
