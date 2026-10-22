import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/platform/db";
import { recordSystemError } from "@/platform/logging/system-errors";
import { hashToken } from "@/shared/token-hash";

/**
 * The funnel client does not call `api.log` today, so there are no exact event names to list. Only these
 * families are accepted; a new client event must start with one of them.
 */
export const LOG_TYPE_PREFIXES = ["video.", "upload.", "camera.", "recorder.", "network.", "form.", "task.", "client."] as const;
export const isKnownLogType = (t: string) => LOG_TYPE_PREFIXES.some((p) => t.startsWith(p));

export const logSchema = z.object({
  type: z
    .string()
    .regex(/^[A-Za-z0-9_.-]{1,60}$/)
    .refine(isKnownLogType, "Unknown event type"),
  data: z.record(z.string(), z.unknown()).default({}),
  resumeToken: z.string().max(200).optional(),
});

const MAX_DATA_CHARS = 4000;

/** Client events go to system_errors. Contact details are never stored: only the applicant id, found by token. */
export async function logClientEvent(input: z.output<typeof logSchema>) {
  let applicantId: string | null = null;
  if (input.resumeToken) {
    const [a] = await db()
      .select({ id: tables.applicants.id })
      .from(tables.applicants)
      .where(eq(tables.applicants.resumeTokenHash, hashToken(input.resumeToken)));
    applicantId = a?.id ?? null;
  }
  const json = JSON.stringify(input.data);
  const data = json.length > MAX_DATA_CHARS ? { truncated: true } : input.data;
  // Repeats of the same open event are merged, so a loop of calls cannot stack rows or alerts.
  await recordSystemError({ source: `client:${input.type}`, message: input.type, data, applicantId });
}
