/** Fixed-window style limiter over a pluggable store (Postgres in production, memory in tests and fallbacks). */
export interface RateLimitStore {
  /** Hits recorded for `bucket` at or after `since`. */
  count(bucket: string, since: Date): Promise<number>;
  record(bucket: string, at: Date): Promise<void>;
  /**
   * Counts and records in one atomic step: records a hit and returns true only while fewer than `max`
   * hits exist at or after `since`. Stores that can do this should, because count then record races under parallel requests.
   */
  tryRecord?(bucket: string, since: Date, max: number, at: Date): Promise<boolean>;
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
    async tryRecord(bucket, since, max, at) {
      // No await between the read and the write, so parallel callers cannot interleave.
      const list = (hits.get(bucket) ?? []).filter((t) => t >= since.getTime());
      if (list.length >= max) return false;
      list.push(at.getTime());
      hits.set(bucket, list);
      return true;
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
  const since = new Date(now.getTime() - rule.windowMs);
  if (store.tryRecord) return store.tryRecord(bucket, since, rule.max, now);
  const used = await store.count(bucket, since);
  if (used >= rule.max) return false;
  await store.record(bucket, now);
  return true;
}
