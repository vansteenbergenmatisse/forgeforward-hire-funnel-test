import { and, eq, isNull, lt } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { ApiError } from "./errors";

const WAIT_STEPS = 10;
const WAIT_MS = 300;
/** A claimed key with no response after this long belongs to a request that died. A retry takes it over. */
const STALE_MS = 30_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lets a route keep secrets out of the stored row. `open` returns null for a stored value it cannot trust. */
export type StoredCodec<T> = { seal: (result: T) => object; open: (stored: unknown) => T | null };

/**
 * Runs `work` once per (route, key). A repeat returns the stored response.
 * A failed run frees the key so the client can retry.
 * With a `codec`, the stored row holds `codec.seal(result)`. A stored value that `open` rejects
 * (legacy plaintext, tampering, changed key) is deleted and treated as a miss, so it is never returned.
 */
export async function once<T extends object>(route: string, key: string, work: () => Promise<T>, codec?: StoredCodec<T>): Promise<T> {
  const full = `${route}:${key}`;
  const d = db();
  const claimed = await d
    .insert(tables.idempotencyKeys)
    .values({ key: full, route })
    .onConflictDoNothing()
    .returning({ id: tables.idempotencyKeys.id });

  if (claimed.length === 0) {
    for (let i = 0; i < WAIT_STEPS; i++) {
      const [row] = await d.select().from(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.key, full));
      if (row?.response) {
        if (!codec) return row.response as T;
        const opened = codec.open(row.response);
        if (opened) return opened;
        await d.delete(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.id, row.id));
        return once(route, key, work, codec);
      }
      if (!row) return once(route, key, work, codec);
      if (!row.response && Date.now() - row.createdAt.getTime() > STALE_MS) {
        await d.delete(tables.idempotencyKeys).where(and(eq(tables.idempotencyKeys.id, row.id), isNull(tables.idempotencyKeys.response)));
        return once(route, key, work, codec);
      }
      await sleep(WAIT_MS);
    }
    throw new ApiError(409, "in_progress", "Still saving. Try again in a moment.");
  }

  try {
    const result = await work();
    await d.update(tables.idempotencyKeys).set({ response: codec ? codec.seal(result) : result }).where(eq(tables.idempotencyKeys.id, claimed[0].id));
    return result;
  } catch (err) {
    await d.delete(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.id, claimed[0].id));
    throw err;
  }
}

/** Keys only matter for retries of the same request, so a day is plenty. Returns how many rows were removed. */
export async function pruneIdempotencyKeys(olderThanMs = 24 * 60 * 60_000, now = Date.now()): Promise<number> {
  const rows = await db()
    .delete(tables.idempotencyKeys)
    .where(lt(tables.idempotencyKeys.createdAt, new Date(now - olderThanMs)))
    .returning({ id: tables.idempotencyKeys.id });
  return rows.length;
}
