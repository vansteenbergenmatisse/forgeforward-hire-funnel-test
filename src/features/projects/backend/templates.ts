import { eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import type { TemplateDef } from "../types";
import { projectBySlug } from "./bundles";
import { notFound, unprocessable } from "./errors";
import { toTemplate } from "./mappers";
import { lastPosition } from "./projects";
import type { z } from "zod";
import type { createTemplateBody, updateTemplateBody } from "./schemas";

const T = tables;
type TemplateRow = typeof T.messageTemplates.$inferSelect;

type Fields = Pick<TemplateRow, "channel" | "name" | "subject" | "body" | "waTemplateName" | "waLanguage" | "waVariables">;

/** Channel rules: email needs a subject, WhatsApp needs the Meta template name and language. Other channels drop WhatsApp fields. */
function checked(f: Fields): Fields {
  if (f.channel === "email" && f.subject.trim() === "") throw unprocessable("invalid_template", "Add a subject for the email.");
  if (f.channel !== "whatsapp") return { ...f, subject: f.channel === "email" ? f.subject.trim() : "", waTemplateName: null, waLanguage: null, waVariables: [] };
  const name = (f.waTemplateName ?? "").trim();
  if (!/^[a-z0-9_]+$/.test(name)) throw unprocessable("invalid_template", "Meta names use lowercase letters, numbers and underscores.");
  const lang = (f.waLanguage ?? "").trim();
  if (lang === "") throw unprocessable("invalid_template", "Add a language code, like en or nl.");
  return { ...f, subject: "", waTemplateName: name, waLanguage: lang };
}

export async function createTemplate(input: z.infer<typeof createTemplateBody>): Promise<TemplateDef> {
  const fields = checked({
    channel: input.channel,
    name: input.name,
    subject: input.subject,
    body: input.body,
    waTemplateName: input.waTemplateName ?? null,
    waLanguage: input.waLanguage ?? null,
    waVariables: input.waVariables ?? [],
  });
  return db().transaction(async (tx) => {
    const project = await projectBySlug(tx, input.projectSlug);
    const [row] = await tx
      .insert(T.messageTemplates)
      .values({ ...(input.id ? { id: input.id } : {}), ...fields, projectId: project.id, position: await lastPosition(tx, "messageTemplates", project.id) })
      .returning();
    return toTemplate(row);
  });
}

export async function updateTemplate(id: string, patch: z.infer<typeof updateTemplateBody>): Promise<TemplateDef> {
  const [cur] = await db().select().from(T.messageTemplates).where(eq(T.messageTemplates.id, id)).limit(1);
  if (!cur) throw notFound("Template");
  const fields = checked({
    channel: cur.channel,
    name: patch.name ?? cur.name,
    subject: patch.subject ?? cur.subject,
    body: patch.body ?? cur.body,
    waTemplateName: patch.waTemplateName ?? cur.waTemplateName,
    waLanguage: patch.waLanguage ?? cur.waLanguage,
    waVariables: patch.waVariables ?? cur.waVariables,
  });
  const [row] = await db().update(T.messageTemplates).set(fields).where(eq(T.messageTemplates.id, id)).returning();
  return toTemplate(row);
}

export async function deleteTemplate(id: string): Promise<{ deleted: string }> {
  const rows = await db().delete(T.messageTemplates).where(eq(T.messageTemplates.id, id)).returning({ id: T.messageTemplates.id });
  if (rows.length === 0) throw notFound("Template");
  return { deleted: id };
}
