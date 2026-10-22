/** Fixed-window style limiter over a pluggable store (Postgres in production, memory in tests and fallbacks). */
export interface RateLimitStore {
  /** Hits recorded for `bucket` at or after `since`. */
  count(bucket: string, since: Date): Promise<number>;
  record(bucket: string, at: Date): Promise<void>;
}

export type RateLimitRule = { max: number; windowMs: number };

export function createMemoryRateLimitStore(): RateLimitStore {
  const hits = new Map<string, number[]>();
  return {
    async count(bucket, since) {
      return (hits.get(bucket) ?? []).filter((t) => t >= since.getTime()).length;
    },
    async record(bucket, at) {
      const list = hits.get(bucket) ?? [];
      list.push(at.getTime());
      hits.set(bucket, list);
    },
  };
}

/** Records a hit and returns true when allowed. A blocked call does not record. */
export async function takeRateLimit(
  store: RateLimitStore,
  bucket: string,
  rule: RateLimitRule,
  now: Date = new Date(),
): Promise<boolean> {
  const used = await store.count(bucket, new Date(now.getTime() - rule.windowMs));
  if (used >= rule.max) return false;
  await store.record(bucket, now);
  return true;
}
