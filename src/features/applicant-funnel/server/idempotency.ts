import { eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { ApiError } from "./errors";

const WAIT_STEPS = 10;
const WAIT_MS = 300;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs `work` once per (route, key). A repeat returns the stored response.
 * A failed run frees the key so the client can retry.
 */
export async function once<T extends object>(route: string, key: string, work: () => Promise<T>): Promise<T> {
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
      if (row?.response) return row.response as T;
      if (!row) return once(route, key, work);
      await sleep(WAIT_MS);
    }
    throw new ApiError(409, "in_progress", "Still saving. Try again in a moment.");
  }

  try {
    const result = await work();
    await d.update(tables.idempotencyKeys).set({ response: result }).where(eq(tables.idempotencyKeys.id, claimed[0].id));
    return result;
  } catch (err) {
    await d.delete(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.id, claimed[0].id));
    throw err;
  }
}
