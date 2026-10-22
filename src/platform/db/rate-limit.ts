import { and, gte, sql } from "drizzle-orm";
import { db } from "./index";
import { rateLimitHits } from "./schema";

/**
 * Atomic limiter step for `rate_limit_hits`. Counts and inserts inside one transaction that holds a
 * per-bucket advisory lock, so parallel requests for the same bucket run one after the other.
 * Returns true and records a hit while fewer than `max` hits exist at or after `since`.
 */
export async function tryRecordRateLimitHit(bucket: string, since: Date, max: number, at: Date): Promise<boolean> {
  return db().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${bucket}))`);
    const [row] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(rateLimitHits)
      .where(and(sql`${rateLimitHits.bucket} = ${bucket}`, gte(rateLimitHits.createdAt, since)));
    if ((row?.n ?? 0) >= max) return false;
    await tx.insert(rateLimitHits).values({ bucket, createdAt: at });
    return true;
  });
}
