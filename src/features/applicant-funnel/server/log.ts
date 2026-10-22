import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/platform/db";

export const logSchema = z.object({
  type: z.string().min(1).max(80),
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
      .where(eq(tables.applicants.resumeToken, input.resumeToken));
    applicantId = a?.id ?? null;
  }
  const json = JSON.stringify(input.data);
  const data = json.length > MAX_DATA_CHARS ? { truncated: true } : input.data;
  await db().insert(tables.systemErrors).values({ source: `client:${input.type}`, message: input.type, data, applicantId });
}
