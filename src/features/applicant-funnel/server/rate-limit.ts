import { createHmac } from "node:crypto";
import { clientIp } from "@/shared/client-ip";
import { optionalEnv } from "@/shared/env";
import { createMemoryRateLimitStore, takeRateLimit, type RateLimitRule, type RateLimitStore } from "@/shared/rate-limit";
import { ApiError } from "./errors";
import { createPgRateLimitStore } from "./rate-limit-store";

const memoryStore = createMemoryRateLimitStore();

/** Postgres store. FUNNEL_RATE_LIMIT_STORE=memory switches to an in-process store (single instance only). */
export function limitStore(): RateLimitStore {
  return process.env.FUNNEL_RATE_LIMIT_STORE === "memory" ? memoryStore : createPgRateLimitStore();
}

export { clientIp };

/** IPs are stored only as a keyed hash, salted with the UTC day so buckets cannot be linked across days. */
export function ipBucket(scope: string, ip: string, now: Date = new Date()) {
  const key = createHmac("sha256", optionalEnv("ADMIN_KEY") ?? "rate-limit").update("funnel-ip-hash-v1").digest();
  const day = now.toISOString().slice(0, 10);
  return `${scope}:${createHmac("sha256", key).update(`${day}:${ip}`).digest("hex").slice(0, 32)}`;
}

/** Counts one hit for this caller and scope. Throws 429 when the caller is over the rule. */
export async function enforceRateLimit(req: Pick<Request, "headers">, scope: string, rule: RateLimitRule, message = "Too many tries. Wait a few minutes and try again.") {
  if (!(await takeRateLimit(limitStore(), ipBucket(scope, clientIp(req)), rule))) throw new ApiError(429, "rate_limited", message);
}
