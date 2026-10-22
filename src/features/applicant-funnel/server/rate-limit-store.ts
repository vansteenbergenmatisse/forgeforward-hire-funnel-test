import { and, count, gte, eq } from "drizzle-orm";
import { db, tables, tryRecordRateLimitHit } from "@/platform/db";
import type { RateLimitStore } from "@/shared/rate-limit";

/** Postgres-backed store over `rate_limit_hits`. */
export function createPgRateLimitStore(): RateLimitStore {
  return {
    async count(bucket, since) {
      const [row] = await db()
        .select({ n: count() })
        .from(tables.rateLimitHits)
        .where(and(eq(tables.rateLimitHits.bucket, bucket), gte(tables.rateLimitHits.createdAt, since)));
      return row?.n ?? 0;
    },
    // One transaction with a per-bucket lock, so parallel requests cannot all pass the count.
    tryRecord: tryRecordRateLimitHit,
    async record(bucket, at) {
      await db().insert(tables.rateLimitHits).values({ bucket, createdAt: at });
    },
  };
}
