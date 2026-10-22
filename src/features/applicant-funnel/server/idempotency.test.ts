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
});
