import { eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { normalizeCalLink } from "../cal-link";
import { htmlPlainText, readTaskContent, sanitizeTaskHtml } from "../sanitize-html";
import { validateSlug } from "../slug";
import type { ProjectDef } from "../types";
import { projectBySlug } from "./bundles";
import { conflict, isUniqueViolation, unprocessable } from "./errors";
import { toDef } from "./mappers";
import type { SettingsPatch } from "./schemas";

const T = tables;
const THANK_YOU_VARIABLES = ["first_name", "reply_days"];

function unknownThankYouVariables(text: string): string[] {
  return [...text.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]).filter((v) => !THANK_YOU_VARIABLES.includes(v));
}

export async function getSettings(slug: string): Promise<ProjectDef> {
  return toDef(await projectBySlug(db(), slug));
}

/** Updates the project's General, Video, Task and Thank-you settings. A slug change is applied here, in the one table every other screen reads. */
export async function updateSettings(slug: string, patch: SettingsPatch): Promise<ProjectDef> {
  const d = db();
  const cur = await projectBySlug(d, slug);
  const set: Partial<typeof T.projects.$inferInsert> = {};

  if (patch.slug !== undefined && patch.slug !== cur.slug) {
    const err = validateSlug(patch.slug);
    if (err) throw unprocessable("invalid_slug", err);
    set.slug = patch.slug;
  }
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.intro !== undefined) set.intro = patch.intro.trim();
  if (patch.calLink !== undefined) {
    const raw = patch.calLink.trim();
    const link = raw === "" ? "" : normalizeCalLink(raw);
    if (link === null) throw unprocessable("invalid_cal_link", "Use a Cal.com event link, like cal.com/forgeforward/interview.");
    set.calLink = link;
  }
  if (patch.replyDays !== undefined) set.replyDays = patch.replyDays;
  if (patch.handoffEnabled !== undefined) set.handoffEnabled = patch.handoffEnabled;
  if (patch.videoPrompt !== undefined) set.videoPrompt = patch.videoPrompt;
  if (patch.prepSeconds !== undefined) set.prepSeconds = patch.prepSeconds;
  if (patch.maxRecordSeconds !== undefined) set.maxRecordSeconds = patch.maxRecordSeconds;
  if (patch.retakesAllowed !== undefined) set.retakesAllowed = patch.retakesAllowed;
  if (patch.thankYouText !== undefined) {
    const bad = unknownThankYouVariables(patch.thankYouText);
    if (bad.length) throw unprocessable("invalid_thank_you", `Unknown variable ${bad.map((b) => `{${b}}`).join(", ")}. Use {first_name} or {reply_days}.`);
    set.thankYouText = patch.thankYouText;
  }
  if (patch.taskEnabled !== undefined) set.taskEnabled = patch.taskEnabled;
  if (patch.taskTitle !== undefined) set.taskTitle = patch.taskTitle.trim();
  if (patch.taskBody !== undefined) set.taskContent = { html: sanitizeTaskHtml(patch.taskBody) };
  if (patch.taskAllowText !== undefined) set.taskAllowText = patch.taskAllowText;
  if (patch.taskAllowLink !== undefined) set.taskAllowLink = patch.taskAllowLink;
  if (patch.taskAllowFile !== undefined) set.taskAllowFile = patch.taskAllowFile;

  // A task that is on must be complete, or the funnel would show an empty task.
  const enabled = set.taskEnabled ?? cur.taskEnabled;
  if (enabled) {
    const title = set.taskTitle ?? cur.taskTitle;
    const body = htmlPlainText(set.taskContent ? (set.taskContent as { html: string }).html : readTaskContent(cur.taskContent));
    const canAnswer = (set.taskAllowText ?? cur.taskAllowText) || (set.taskAllowLink ?? cur.taskAllowLink) || (set.taskAllowFile ?? cur.taskAllowFile);
    if (title === "" || body === "" || !canAnswer) {
      throw unprocessable("task_incomplete", "A task needs a title, a description and at least one way to answer.");
    }
  }

  if (Object.keys(set).length === 0) return toDef(cur);
  try {
    const [row] = await d.update(T.projects).set(set).where(eq(T.projects.id, cur.id)).returning();
    return toDef(row);
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict("slug_taken", "Another project already uses this slug. Pick another one.");
    throw e;
  }
}
