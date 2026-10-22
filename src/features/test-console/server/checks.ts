import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, count, eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { deleteObject, headObject, putObject } from "@/platform/r2";
import { signCalcomBody, CALCOM_SIGNATURE_HEADER } from "@/features/bookings/server";
import { checkLastBackup } from "@/features/backups/server";
import { runIntegrity, runRetention } from "@/features/retention/server";
import { fillTemplate, MissingVariableError } from "@/features/messaging";
import { channelModes } from "./channels";
import { CheckFailure, PROJECT_SLUG, call, errorText, need, type Ctx } from "./context";
import type { CheckId, CheckResult, ConsoleState } from "../types";

type Outcome = { detail?: string; state?: ConsoleState };
type Check = (ctx: Ctx, state: ConsoleState) => Promise<Outcome>;

// 1x1 white JPEG, enough for a thumbnail object.
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

async function sampleVideo(): Promise<{ bytes: Buffer; stub: boolean }> {
  try {
    return { bytes: await readFile(path.join(process.cwd(), "test-assets", "sample.webm")), stub: false };
  } catch {
    // The sample file is not in the deployment bundle. A small stub still proves the signed upload flow.
    return { bytes: Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), randomBytes(2048)]), stub: true };
  }
}

async function loadApplicant(id: string) {
  const [row] = await db()
    .select({ a: tables.applicants, role: tables.stages.role, stageName: tables.stages.name })
    .from(tables.applicants)
    .leftJoin(tables.stages, eq(tables.applicants.stageId, tables.stages.id))
    .where(eq(tables.applicants.id, id));
  if (!row) throw new CheckFailure("The test applicant is gone.");
  return row;
}

async function eventCount(applicantId: string, type: string): Promise<number> {
  const [r] = await db()
    .select({ n: count() })
    .from(tables.applicantEvents)
    .where(and(eq(tables.applicantEvents.applicantId, applicantId), eq(tables.applicantEvents.type, type)));
  return r.n;
}

function sampleAnswers(questions: (typeof tables.projectQuestions.$inferSelect)[]) {
  const out: Record<string, string | number | boolean | string[]> = {};
  for (const q of questions) {
    if (q.archived || !q.required) continue;
    out[q.id] =
      q.type === "number" ? 1 : q.type === "yes_no" ? true : q.type === "single_choice" ? (q.options[0] ?? "") : q.type === "multi_choice" ? q.options.slice(0, 1) : "Test answer";
  }
  return out;
}

const checks: Record<CheckId, Check> = {
  async db() {
    const key = `console-${randomUUID()}`;
    await db().insert(tables.idempotencyKeys).values({ key, route: "test-console", response: { ok: true } });
    const rows = await db().select().from(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.key, key));
    await db().delete(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.key, key));
    if (rows.length !== 1) throw new CheckFailure("The row was written but not read back.");
    return {};
  },

  async r2() {
    const key = `test/console/${randomUUID()}.txt`;
    await putObject(key, "ok", "text/plain");
    try {
      const head = await headObject(key);
      if (!head || head.bytes !== 2) throw new CheckFailure("HEAD did not return the object we just wrote.");
    } finally {
      await deleteObject(key);
    }
    if (await headObject(key)) throw new CheckFailure("The object is still there after delete.");
    return {};
  },

  async applicant(ctx) {
    const [project] = await db().select().from(tables.projects).where(eq(tables.projects.slug, PROJECT_SLUG));
    if (!project) throw new CheckFailure(`Project "${PROJECT_SLUG}" not found. Set TEST_PROJECT_SLUG.`);
    const questions = await db().select().from(tables.projectQuestions).where(eq(tables.projectQuestions.projectId, project.id));
    const suffix = randomBytes(4).toString("hex");
    const res = await call(ctx, "/api/apply/start", {
      consoleBypass: true,
      headers: { "idempotency-key": `console-${randomUUID()}` },
      json: {
        projectSlug: PROJECT_SLUG,
        firstName: "Test",
        lastName: `Console ${suffix}`,
        email: `console-${suffix}@forge-hire.test`,
        phone: "+31612345678",
        phoneCountry: "NL",
        whatsappOk: false,
        timezone: "Europe/Amsterdam",
        consent: true,
        answers: sampleAnswers(questions),
        utm: {},
        inAppBrowser: false,
      },
    });
    const b = res.body as { applicant_id?: string; resume_token?: string } | null;
    if (res.status !== 200 || !b?.applicant_id || !b.resume_token) throw new CheckFailure(`/api/apply/start failed. ${errorText(res)}`);
    const { a } = await loadApplicant(b.applicant_id);
    if (!a.isTest) throw new CheckFailure("The applicant was not flagged is_test. It would show on the board.");
    return { detail: "Flagged is_test", state: { applicantId: b.applicant_id, resumeToken: b.resume_token, email: a.email } };
  },

  async upload(ctx, state) {
    const resumeToken = need(state, "resumeToken");
    const urls = await call(ctx, "/api/apply/upload-url", { json: { resumeToken, kind: "video", mime: "video/webm", withThumb: true } });
    const u = urls.body as { key?: string; putUrl?: string; thumbKey?: string; thumbPutUrl?: string } | null;
    if (urls.status !== 200 || !u?.key || !u.putUrl) throw new CheckFailure(`/api/apply/upload-url failed. ${errorText(urls)}`);
    const sample = await sampleVideo();
    const put = await fetch(u.putUrl, { method: "PUT", headers: { "content-type": "video/webm" }, body: new Uint8Array(sample.bytes) });
    if (!put.ok) throw new CheckFailure(`The signed video upload was refused (HTTP ${put.status}). Check the R2 bucket CORS and token.`);
    if (u.thumbKey && u.thumbPutUrl) {
      const t = await fetch(u.thumbPutUrl, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: new Uint8Array(TINY_JPEG) });
      if (!t.ok) throw new CheckFailure(`The signed thumbnail upload was refused (HTTP ${t.status}).`);
    }
    return {
      detail: sample.stub ? "Sample file not in this deployment. Uploaded a 2 KB stub." : `Uploaded ${Math.round(sample.bytes.length / 1024)} KB`,
      state: { videoKey: u.key, thumbKey: u.thumbKey ?? "", videoBytes: sample.bytes.length },
    };
  },

  async "video-complete"(ctx, state) {
    const res = await call(ctx, "/api/apply/video/complete", {
      json: {
        resumeToken: need(state, "resumeToken"),
        key: need(state, "videoKey"),
        ...(state.thumbKey ? { thumbKey: String(state.thumbKey) } : {}),
        mime: "video/webm",
        bytes: Number(state.videoBytes),
        seconds: 3,
        audioOnly: false,
        retakeUsed: false,
      },
    });
    if (res.status >= 300) throw new CheckFailure(`/api/apply/video/complete failed. ${errorText(res)}`);
    const { a } = await loadApplicant(need(state, "applicantId"));
    if (a.videoKey !== state.videoKey || a.funnelStep !== "video_done") throw new CheckFailure("The video was not saved on the applicant.");
    return {};
  },

  async task(ctx, state) {
    const res = await call(ctx, "/api/apply/task", {
      headers: { "idempotency-key": `console-${randomUUID()}` },
      json: { resumeToken: need(state, "resumeToken"), skip: false, text: "Test answer from the test console." },
    });
    if (res.status >= 300) throw new CheckFailure(`/api/apply/task failed. ${errorText(res)}`);
    const row = await loadApplicant(need(state, "applicantId"));
    if (row.role !== "entry_task") throw new CheckFailure(`The stage is "${row.stageName ?? "none"}", expected the Did task stage.`);
    if (row.a.funnelStep !== "completed") throw new CheckFailure("The application was not marked completed.");
    return { detail: `Stage: ${row.stageName}` };
  },

  async "stage-drag"(ctx, state) {
    const id = need(state, "applicantId");
    const row = await loadApplicant(id);
    const stages = await db().select().from(tables.stages).where(eq(tables.stages.projectId, row.a.projectId));
    // Not Hired or Rejected: the next check books an interview and a booking never moves cards out of those.
    const terminal = (name: string) => ["hired", "rejected"].includes(name.trim().toLowerCase());
    const open = stages.filter((s) => s.id !== row.a.stageId && s.role !== "on_booking" && !s.isPositive && !terminal(s.name));
    const target = open.find((s) => s.role === null) ?? open[0];
    if (!target) throw new CheckFailure("The project has no second stage to move to.");
    const res = await call(ctx, `/api/admin/applicants/${id}`, { method: "PATCH", admin: true, json: { stageId: target.id } });
    if (res.status !== 200) throw new CheckFailure(`PATCH /api/admin/applicants failed. ${errorText(res)}`);
    if ((await loadApplicant(id)).a.stageId !== target.id) throw new CheckFailure("The stage did not change in the database.");
    return { detail: `Moved to ${target.name}` };
  },

  async webhook(ctx, state) {
    const id = need(state, "applicantId");
    const uid = `console-test-${randomBytes(6).toString("hex")}`;
    const start = new Date(Date.now() + 2 * 86_400_000);
    const raw = JSON.stringify({
      triggerEvent: "BOOKING_CREATED",
      createdAt: new Date().toISOString(),
      payload: {
        uid,
        title: "Test console interview",
        startTime: start.toISOString(),
        endTime: new Date(start.getTime() + 1_800_000).toISOString(),
        attendees: [{ email: String(state.email ?? "") }],
        metadata: { applicant_id: id },
      },
    });
    const secret = process.env.CALCOM_WEBHOOK_SECRET;
    if (!secret) return { detail: "Skipped. The Cal.com webhook is not enabled (no CALCOM_WEBHOOK_SECRET)." };
    const headers: Record<string, string> = { [CALCOM_SIGNATURE_HEADER]: signCalcomBody(raw, secret) };
    const res = await call(ctx, "/api/webhooks/calcom", { headers, body: raw });
    if (res.status !== 200) throw new CheckFailure(`Webhook refused. ${errorText(res)}`);
    const row = await loadApplicant(id);
    if (row.role !== "on_booking") throw new CheckFailure(`The stage is "${row.stageName ?? "none"}", expected Interview booked.`);
    return { detail: `Moved to ${row.stageName}`, state: { webhookRaw: raw, webhookEvents: await eventCount(id, "booking_created") } };
  },

  async "webhook-repeat"(ctx, state) {
    const id = need(state, "applicantId");
    const secret = process.env.CALCOM_WEBHOOK_SECRET;
    if (!secret) return { detail: "Skipped. The Cal.com webhook is not enabled." };
    const raw = need(state, "webhookRaw");
    const headers: Record<string, string> = { [CALCOM_SIGNATURE_HEADER]: signCalcomBody(raw, secret) };
    const res = await call(ctx, "/api/webhooks/calcom", { headers, body: raw });
    if (res.status !== 200) throw new CheckFailure(`Webhook refused. ${errorText(res)}`);
    if ((res.body as { result?: string } | null)?.result !== "duplicate") throw new CheckFailure("The repeat was not dropped as a duplicate.");
    if ((await eventCount(id, "booking_created")) !== Number(state.webhookEvents)) throw new CheckFailure("The repeat added a second timeline event.");
    return { detail: "Second call ignored" };
  },

  async "messages-dry-run"() {
    const modes = channelModes();
    const rows = await db()
      .select()
      .from(tables.messageTemplates)
      .innerJoin(tables.projects, eq(tables.messageTemplates.projectId, tables.projects.id))
      .where(eq(tables.projects.slug, PROJECT_SLUG));
    const values = { first_name: "Test", last_name: "Console", project_name: "Appointment Setter", cal_link: "https://cal.com/example" };
    for (const channel of ["email", "whatsapp", "sms"] as const) {
      const t = rows.find((r) => r.message_templates.channel === channel);
      if (!t) throw new CheckFailure(`No ${channel} template on "${PROJECT_SLUG}".`);
      try {
        fillTemplate(t.message_templates.body, values);
        if (t.message_templates.subject) fillTemplate(t.message_templates.subject, values);
      } catch (e) {
        if (e instanceof MissingVariableError) throw new CheckFailure(`The ${channel} template needs {${e.variable}}.`);
        throw e;
      }
    }
    const link = (["email", "whatsapp", "sms"] as const).filter((c) => modes[c] === "link");
    return { detail: link.length ? `Link mode: ${link.join(", ")} (keys missing)` : "All three in API mode" };
  },

  async retention() {
    const r = await runRetention({ dryRun: true, budgetMs: 20_000 });
    const more = r.done ? "" : " or more";
    return { detail: `Would delete ${r.files} files from ${r.applicants}${more} applicants` };
  },

  async backup() {
    const r = await checkLastBackup();
    if (!r.ok) throw new CheckFailure(r.text);
    return { detail: r.text };
  },

  async integrity() {
    const r = await runIntegrity({ dryRun: true, budgetMs: 20_000 });
    if (r.errors > 0) throw new CheckFailure(`${r.errors} files could not be checked. Storage may be unreachable.`);
    if (r.missing > 0) throw new CheckFailure(`${r.missing} files are missing from storage. See system errors after the 05:00 UTC run.`);
    return { detail: `${r.checked} files checked, 0 missing${r.done ? "" : " so far"}` };
  },
};

/** Runs one check. Never throws: a failure becomes a failed result with a short message. */
export async function runCheck(id: CheckId, ctx: Ctx, state: ConsoleState): Promise<{ result: CheckResult; state: ConsoleState }> {
  const started = Date.now();
  try {
    const out = await checks[id](ctx, state);
    return { result: { ok: true, ms: Date.now() - started, detail: out.detail }, state: { ...state, ...out.state } };
  } catch (err) {
    const message = err instanceof CheckFailure ? err.message : err instanceof Error ? err.message.slice(0, 200) : "Check failed.";
    return { result: { ok: false, ms: Date.now() - started, error: message }, state };
  }
}

