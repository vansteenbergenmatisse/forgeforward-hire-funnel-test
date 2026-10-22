import { and, eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import {
  applyBookingEvent,
  findApplicantForBooking,
  saveUnmatchedBooking,
  type BookingEvent,
} from "@/features/applicants/server";
import { checkWebhookAuth, CALCOM_SIGNATURE_HEADER } from "./signature";
import { parseCalcomWebhook } from "./parse";



/** A signed payload older than this is treated as a replay. Cal.com retries soon after a failure, so a short window is enough. */
export const WEBHOOK_MAX_AGE_MS = 15 * 60_000;
/** Allowed clock difference for a payload that claims to be from the future. */
const WEBHOOK_FUTURE_SKEW_MS = 5 * 60_000;

/** True when the payload says it was sent outside the accepted window. A payload without a time is accepted. */
export function isReplay(sentAt: Date | null, now: Date): boolean {
  if (!sentAt) return false;
  const age = now.getTime() - sentAt.getTime();
  return age > WEBHOOK_MAX_AGE_MS || age < -WEBHOOK_FUTURE_SKEW_MS;
}

export type WebhookOutcome =
  | { status: 200; result: "applied" | "duplicate" | "unmatched" | "ignored" | "stale" }
  | { status: 400 | 401 | 503; result: "error"; reason: string };

/** Booking uid plus trigger, per the spec. A reschedule has its own new uid, so it is a distinct key. */
export function dedupeKey(ev: BookingEvent): string {
  return `${ev.uid}:${ev.trigger}`;
}

/** Inserts the dedupe row. False when this booking event was already processed. */
async function claim(ev: BookingEvent): Promise<boolean> {
  const rows = await db()
    .insert(tables.processedWebhooks)
    .values({ provider: "calcom", externalId: dedupeKey(ev) })
    .onConflictDoNothing()
    .returning({ id: tables.processedWebhooks.id });
  return rows.length > 0;
}

async function release(ev: BookingEvent) {
  await db()
    .delete(tables.processedWebhooks)
    .where(and(eq(tables.processedWebhooks.provider, "calcom"), eq(tables.processedWebhooks.externalId, dedupeKey(ev))));
}

export async function handleCalcomWebhook(
  rawBody: string,
  signatureHeader: string | null,
  opts: { secret: string | undefined; nodeEnv?: string | undefined; log?: (msg: string) => void; now?: Date },
): Promise<WebhookOutcome> {
  const auth = checkWebhookAuth(rawBody, signatureHeader, opts.secret, opts.nodeEnv);
  if (!auth.ok) {
    opts.log?.(`calcom webhook rejected: ${auth.reason}`);
    return { status: auth.status, result: "error", reason: auth.reason };
  }
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { status: 400, result: "error", reason: "invalid json" };
  }
  const parsed = parseCalcomWebhook(json);
  if (parsed.kind === "invalid") return { status: 400, result: "error", reason: "invalid payload" };
  if (parsed.kind === "ignored") return { status: 200, result: "ignored" };

  const ev = parsed.event;
  if (isReplay(parsed.sentAt, opts.now ?? new Date())) {
    opts.log?.(`calcom webhook ignored: sent outside the accepted time window (${ev.trigger})`);
    return { status: 200, result: "stale" };
  }
  if (!(await claim(ev))) return { status: 200, result: "duplicate" };
  try {
    const applicantId = await findApplicantForBooking(ev);
    if (!applicantId) {
      await saveUnmatchedBooking(ev);
      return { status: 200, result: "unmatched" };
    }
    const r = await applyBookingEvent(applicantId, ev);
    return { status: 200, result: r.applied ? "applied" : "stale" };
  } catch (err) {
    // Let Cal.com retry: free the dedupe row so the retry is not dropped.
    await release(ev).catch(() => undefined);
    throw err;
  }
}
export { signCalcomBody, verifyCalcomSignature, checkWebhookAuth } from "./signature";
export { parseCalcomWebhook } from "./parse";
export { CALCOM_SIGNATURE_HEADER };
