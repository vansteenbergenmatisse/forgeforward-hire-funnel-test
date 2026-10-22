import { and, desc, eq, sql } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import type { OutgoingRow, SendStore } from "./send-server";
import type { DeliveryStatus, WebhookStore } from "./webhook-server";

export const sendStore: SendStore = {
  async loadApplicant(id) {
    const [r] = await db()
      .select({
        id: tables.applicants.id,
        firstName: tables.applicants.firstName,
        lastName: tables.applicants.lastName,
        email: tables.applicants.email,
        phoneE164: tables.applicants.phoneE164,
        projectName: tables.projects.name,
        calLink: tables.projects.calLink,
      })
      .from(tables.applicants)
      .innerJoin(tables.projects, eq(tables.projects.id, tables.applicants.projectId))
      .where(eq(tables.applicants.id, id));
    return r ?? null;
  },
  async loadTemplate(id) {
    const [t] = await db().select().from(tables.messageTemplates).where(eq(tables.messageTemplates.id, id));
    if (!t) return null;
    return {
      id: t.id,
      channel: t.channel,
      name: t.name,
      subject: t.subject,
      body: t.body,
      waTemplateName: t.waTemplateName ?? undefined,
      waLanguage: t.waLanguage ?? undefined,
      waVariables: t.waVariables,
    };
  },
  async lastWhatsAppReplyAt(applicantId) {
    const [m] = await db()
      .select({ at: tables.messages.createdAt })
      .from(tables.messages)
      .where(and(eq(tables.messages.applicantId, applicantId), eq(tables.messages.channel, "whatsapp"), eq(tables.messages.direction, "in")))
      .orderBy(desc(tables.messages.createdAt))
      .limit(1);
    return m?.at ?? null;
  },
  async insertMessage(row: OutgoingRow) {
    await db().insert(tables.messages).values({ ...row, direction: "out", readByMatt: true });
  },
};

export const webhookStore: WebhookStore = {
  async currentStatus(pid) {
    const [m] = await db().select({ s: tables.messages.status }).from(tables.messages).where(eq(tables.messages.providerMessageId, pid)).limit(1);
    return m?.s ?? null;
  },
  async updateStatus(pid, status: DeliveryStatus, error) {
    await db().update(tables.messages).set({ status, error, updatedAt: new Date() }).where(eq(tables.messages.providerMessageId, pid));
  },
  async recordInbound(e) {
    const fresh = await db()
      .insert(tables.processedWebhooks)
      .values({ provider: "whatsapp", externalId: e.messageId })
      .onConflictDoNothing()
      .returning({ id: tables.processedWebhooks.id });
    if (fresh.length === 0) return false;
    const digits = e.from.replace(/\D/g, "");
    // Newest applicant with this phone number.
    const [a] = await db()
      .select({ id: tables.applicants.id })
      .from(tables.applicants)
      .where(sql`regexp_replace(${tables.applicants.phoneE164}, '\\D', '', 'g') = ${digits}`)
      .orderBy(desc(tables.applicants.createdAt))
      .limit(1);
    if (!a) return true;
    await db().insert(tables.messages).values({
      applicantId: a.id,
      channel: "whatsapp",
      direction: "in",
      mode: "api",
      body: e.text,
      providerMessageId: e.messageId,
      status: "received",
      readByMatt: false,
      createdAt: e.at,
    });
    await db().update(tables.applicants).set({ unreadReply: true, updatedAt: new Date() }).where(eq(tables.applicants.id, a.id));
    return true;
  },
};
