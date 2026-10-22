import { and, desc, eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { runCheck } from "./checks";
import { channelModes } from "./channels";
import { PROJECT_SLUG, call, type Ctx } from "./context";
import type { Channel, SendResult } from "../types";

async function testApplicantId(ctx: Ctx): Promise<string | null> {
  const [existing] = await db()
    .select({ id: tables.applicants.id })
    .from(tables.applicants)
    .where(eq(tables.applicants.isTest, true))
    .orderBy(desc(tables.applicants.createdAt))
    .limit(1);
  if (existing) return existing.id;
  const made = await runCheck("applicant", ctx, {});
  return made.result.ok ? String(made.state.applicantId) : null;
}

/** "Send test to me": goes to TEST_EMAIL or TEST_PHONE through the normal send route, in test mode. */
export async function sendTestMessage(ctx: Ctx, channel: Channel): Promise<SendResult> {
  if (channelModes()[channel] === "link") {
    return { ok: true, message: "Link mode: the provider keys are missing, so nothing was sent." };
  }
  const [row] = await db()
    .select({ id: tables.messageTemplates.id })
    .from(tables.messageTemplates)
    .innerJoin(tables.projects, eq(tables.messageTemplates.projectId, tables.projects.id))
    .where(and(eq(tables.projects.slug, PROJECT_SLUG), eq(tables.messageTemplates.channel, channel)))
    .limit(1);
  const applicantId = await testApplicantId(ctx);
  if (!row || !applicantId) return { ok: false, message: "No template or test applicant to send with." };

  const res = await call(ctx, "/api/admin/messages/send", {
    admin: true,
    json: { applicantId, channel, templateId: row.id, test: true },
  });
  const out = res.body as { ok?: boolean; error?: string } | null;
  if (res.status === 200 && out?.ok) return { ok: true, message: "Sent. It should arrive within a minute." };
  return { ok: false, message: out?.error ?? `The send route answered HTTP ${res.status}.` };
}
