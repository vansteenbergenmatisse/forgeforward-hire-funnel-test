import { and, isNotNull, lt } from "drizzle-orm";
import { db } from "./index";
import { idempotencyKeys, processedWebhooks, rateLimitHits, systemErrors } from "./schema";

const DAY = 86_400_000;

/** How long each operational table keeps rows. Applicant media has its own retention job. */
export const OPERATIONAL_RETENTION_DAYS = {
  idempotencyKeys: 7,
  rateLimitHits: 1,
  processedWebhooks: 30,
  resolvedSystemErrors: 90,
} as const;

/** Deletes expired rows from the tables that only grow. Safe to run every day. Returns rows removed per table. */
export async function pruneOperationalTables(now: Date = new Date()) {
  const cutoff = (days: number) => new Date(now.getTime() - days * DAY);
  const d = db();
  const keys = await d
    .delete(idempotencyKeys)
    .where(lt(idempotencyKeys.createdAt, cutoff(OPERATIONAL_RETENTION_DAYS.idempotencyKeys)))
    .returning({ id: idempotencyKeys.id });
  const hits = await d
    .delete(rateLimitHits)
    .where(lt(rateLimitHits.createdAt, cutoff(OPERATIONAL_RETENTION_DAYS.rateLimitHits)))
    .returning({ id: rateLimitHits.id });
  const hooks = await d
    .delete(processedWebhooks)
    .where(lt(processedWebhooks.createdAt, cutoff(OPERATIONAL_RETENTION_DAYS.processedWebhooks)))
    .returning({ id: processedWebhooks.id });
  const errors = await d
    .delete(systemErrors)
    .where(and(isNotNull(systemErrors.resolvedAt), lt(systemErrors.resolvedAt, cutoff(OPERATIONAL_RETENTION_DAYS.resolvedSystemErrors))))
    .returning({ id: systemErrors.id });
  return {
    idempotencyKeys: keys.length,
    rateLimitHits: hits.length,
    processedWebhooks: hooks.length,
    systemErrors: errors.length,
  };
}
