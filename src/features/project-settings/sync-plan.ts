import { normalizeCalLink, type ProjectBundle, type ProjectDef, type QuestionDef, type StageDef, type StageRole, type TemplateDef } from "@/features/projects";
import { INTRO_MAX, THANK_YOU_MAX, VIDEO_PROMPT_MAX } from "./logic/limits";
import { validateProjectName, validateReplyDays } from "./logic/general";
import { validateQuestion, normalizeQuestion } from "./logic/questions";
import { validateStageName } from "./logic/stages";
import { validateTask } from "./logic/task";
import { validateTemplate } from "./logic/templates";
import { validateThankYou } from "./logic/thank-you";
import { validateVideo } from "./logic/video";

/**
 * One request that brings the server closer to the local copy. `apply` returns the baseline
 * (what the server holds) after the request succeeded. Edits that are not valid yet produce no
 * request, so a half-typed template or an empty task title never reaches the database.
 */
export type SyncOp = {
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  /** What the request changes. When the server refuses it, this part of the local copy is put back to the server's version. */
  entity: SyncEntity;
  apply: (b: ProjectBundle) => ProjectBundle;
};

export type SyncEntity =
  | { kind: "project"; fields: string[] }
  | { kind: "stage" | "question" | "template"; id: string }
  | { kind: "order"; list: "stages" | "questions" };

export type StageMoves = ReadonlyMap<string, string>;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function projectOps(base: ProjectBundle, next: ProjectBundle): SyncOp[] {
  const b = base.def;
  const n = next.def;
  const patch: Partial<Record<keyof ProjectDef, unknown>> = {};
  const take = (k: keyof ProjectDef, ok = true) => {
    if (ok && !same(n[k], b[k])) patch[k] = n[k];
  };

  take("name", validateProjectName(n.name) === null);
  take("status");
  take("handoffEnabled");
  take("intro", n.intro.length <= INTRO_MAX);
  if (n.calLink !== b.calLink) {
    const link = n.calLink.trim() === "" ? "" : normalizeCalLink(n.calLink);
    if (link !== null) patch.calLink = link;
  }
  take("replyDays", validateReplyDays(String(n.replyDays)) === null);
  const video = validateVideo(n);
  take("prepSeconds", !video.prepSeconds);
  take("maxRecordSeconds", !video.maxRecordSeconds);
  take("retakesAllowed", !video.retakesAllowed);
  take("videoPrompt", n.videoPrompt.trim() !== "" && n.videoPrompt.length <= VIDEO_PROMPT_MAX);
  take("thankYouText", validateThankYou(n.thankYouText) === null && n.thankYouText.length <= THANK_YOU_MAX);

  // Task fields travel together, and a task that is on must be complete.
  const taskKeys = ["taskEnabled", "taskTitle", "taskBody", "taskAllowText", "taskAllowLink", "taskAllowFile"] as const;
  if (taskKeys.some((k) => !same(n[k], b[k]))) {
    const complete = !n.taskEnabled || Object.keys(validateTask(n)).length === 0;
    if (complete) for (const k of taskKeys) take(k);
  }

  if (Object.keys(patch).length === 0) return [];
  return [
    {
      method: "PATCH",
      path: `/api/admin/settings/${base.def.slug}`,
      body: patch,
      entity: { kind: "project", fields: Object.keys(patch) },
      apply: (x) => ({ ...x, def: { ...x.def, ...patch } as ProjectDef }),
    },
  ];
}

function orderOps<T extends { id: string }>(slug: string, kind: "stages" | "questions", predicted: T[], desired: T[]): SyncOp[] {
  const want = desired.filter((d) => predicted.some((p) => p.id === d.id)).map((d) => d.id);
  if (want.length === predicted.length && want.every((id, i) => id === predicted[i].id)) return [];
  return [
    {
      method: "POST",
      path: `/api/admin/${kind}/reorder`,
      body: { projectSlug: slug, ids: want },
      entity: { kind: "order", list: kind },
      apply: (x) => ({ ...x, [kind]: want.map((id) => (x[kind] as unknown as T[]).find((i) => i.id === id)).filter(Boolean) }) as ProjectBundle,
    },
  ];
}

function stageOps(base: ProjectBundle, next: ProjectBundle, moves: StageMoves): SyncOp[] {
  const slug = base.def.slug;
  const ops: SyncOp[] = [];
  const baseIds = new Set(base.stages.map((s) => s.id));
  const nextIds = new Set(next.stages.map((s) => s.id));

  const created = next.stages.filter((s) => !baseIds.has(s.id) && validateStageName(next.stages, s.id, s.name) === null);
  for (const s of created) {
    ops.push({
      method: "POST",
      path: "/api/admin/stages",
      body: { id: s.id, projectSlug: slug, name: s.name, color: s.color, isPositive: s.isPositive },
      entity: { kind: "stage", id: s.id },
      apply: (x) => ({ ...x, stages: [...x.stages, { ...s, role: null }] }),
    });
  }

  // Role changes are replayed on a copy so a swap sends one request, not two.
  const sim = new Map<string, StageRole>(base.stages.map((s) => [s.id, s.role]));
  for (const s of next.stages) {
    if (!baseIds.has(s.id)) continue;
    const prev = base.stages.find((x) => x.id === s.id) as StageDef;
    const patch: Partial<StageDef> = {};
    if (s.name !== prev.name && validateStageName(next.stages, s.id, s.name) === null) patch.name = s.name;
    if (s.color !== prev.color) patch.color = s.color;
    if (s.isPositive !== prev.isPositive) patch.isPositive = s.isPositive;
    if (s.role && sim.get(s.id) !== s.role) {
      patch.role = s.role;
      const holder = [...sim.entries()].find(([id, r]) => r === s.role && id !== s.id);
      const old = sim.get(s.id) ?? null;
      if (holder) sim.set(holder[0], old);
      sim.set(s.id, s.role);
    }
    if (Object.keys(patch).length === 0) continue;
    const roleChanged = "role" in patch;
    ops.push({
      method: "PATCH",
      path: `/api/admin/stages/${s.id}`,
      body: patch,
      entity: { kind: "stage", id: s.id },
      apply: (x) => {
        let stages = x.stages.map((st) => (st.id === s.id ? { ...st, ...patch } : st));
        if (roleChanged) {
          const oldRole = x.stages.find((st) => st.id === s.id)?.role ?? null;
          stages = stages.map((st) => (st.id !== s.id && st.role === patch.role ? { ...st, role: oldRole } : st));
        }
        return { ...x, stages };
      },
    });
  }

  for (const s of base.stages) {
    if (nextIds.has(s.id)) continue;
    const moveTo = moves.get(s.id);
    ops.push({
      method: "DELETE",
      path: `/api/admin/stages/${s.id}${moveTo ? `?moveTo=${moveTo}` : ""}`,
      entity: { kind: "stage", id: s.id },
      apply: (x) => ({ ...x, stages: x.stages.filter((st) => st.id !== s.id) }),
    });
  }

  const predicted = [...base.stages.filter((s) => nextIds.has(s.id)), ...created];
  return [...ops, ...orderOps(slug, "stages", predicted, next.stages)];
}

function questionOps(base: ProjectBundle, next: ProjectBundle): SyncOp[] {
  const slug = base.def.slug;
  const ops: SyncOp[] = [];
  const baseIds = new Set(base.questions.map((q) => q.id));
  const nextIds = new Set(next.questions.map((q) => q.id));
  const valid = (q: QuestionDef) => Object.keys(validateQuestion(q)).length === 0;

  const created = next.questions.filter((q) => !baseIds.has(q.id) && valid(q));
  for (const raw of created) {
    const q = normalizeQuestion(raw);
    ops.push({
      method: "POST",
      path: "/api/admin/questions",
      body: { id: q.id, projectSlug: slug, label: q.label, helpText: q.helpText, type: q.type, options: q.options, required: q.required },
      entity: { kind: "question", id: q.id },
      apply: (x) => ({ ...x, questions: [...x.questions, { ...q, archived: false }] }),
    });
    if (raw.archived) {
      ops.push({
        method: "PATCH",
        path: `/api/admin/questions/${q.id}`,
        body: { archived: true },
        entity: { kind: "question", id: q.id },
        apply: (x) => ({ ...x, questions: x.questions.map((i) => (i.id === q.id ? { ...i, archived: true } : i)) }),
      });
    }
  }

  for (const raw of next.questions) {
    const prev = base.questions.find((q) => q.id === raw.id);
    if (!prev) continue;
    const q = valid(raw) ? normalizeQuestion(raw) : { ...prev, archived: raw.archived };
    const patch: Partial<QuestionDef> = {};
    for (const k of ["label", "helpText", "type", "required", "archived"] as const) if (!same(q[k], prev[k])) Object.assign(patch, { [k]: q[k] });
    if (!same(q.options, prev.options) || "type" in patch) patch.options = q.options;
    if (Object.keys(patch).length === 0) continue;
    ops.push({
      method: "PATCH",
      path: `/api/admin/questions/${raw.id}`,
      body: patch,
      entity: { kind: "question", id: raw.id },
      apply: (x) => ({ ...x, questions: x.questions.map((i) => (i.id === raw.id ? { ...i, ...patch } : i)) }),
    });
  }

  for (const q of base.questions) {
    if (nextIds.has(q.id)) continue;
    ops.push({
      method: "DELETE",
      path: `/api/admin/questions/${q.id}`,
      entity: { kind: "question", id: q.id },
      apply: (x) => ({ ...x, questions: x.questions.filter((i) => i.id !== q.id) }),
    });
  }

  const predicted = [...base.questions.filter((q) => nextIds.has(q.id)), ...created];
  return [...ops, ...orderOps(slug, "questions", predicted, next.questions)];
}

const waFields = (t: TemplateDef) => ({ waTemplateName: t.waTemplateName ?? "", waLanguage: t.waLanguage ?? "", waVariables: t.waVariables ?? [] });

function templateOps(base: ProjectBundle, next: ProjectBundle): SyncOp[] {
  const slug = base.def.slug;
  const ops: SyncOp[] = [];
  const nextIds = new Set(next.templates.map((t) => t.id));
  const valid = (t: TemplateDef) => Object.keys(validateTemplate(t)).length === 0;

  for (const t of next.templates) {
    const prev = base.templates.find((x) => x.id === t.id);
    if (!valid(t)) continue;
    if (!prev) {
      ops.push({
        method: "POST",
        path: "/api/admin/templates",
        entity: { kind: "template", id: t.id },
        body: { id: t.id, projectSlug: slug, channel: t.channel, name: t.name.trim(), subject: t.subject, body: t.body, ...(t.channel === "whatsapp" ? waFields(t) : {}) },
        apply: (x) => ({ ...x, templates: [...x.templates, t] }),
      });
      continue;
    }
    const patch: Record<string, unknown> = {};
    if (t.name !== prev.name) patch.name = t.name.trim();
    if (t.subject !== prev.subject) patch.subject = t.subject;
    if (t.body !== prev.body) patch.body = t.body;
    if (t.channel === "whatsapp") {
      const a = waFields(t);
      const p = waFields(prev);
      if (a.waTemplateName !== p.waTemplateName) patch.waTemplateName = a.waTemplateName;
      if (a.waLanguage !== p.waLanguage) patch.waLanguage = a.waLanguage;
      if (!same(a.waVariables, p.waVariables)) patch.waVariables = a.waVariables;
    }
    if (Object.keys(patch).length === 0) continue;
    ops.push({
      method: "PATCH",
      path: `/api/admin/templates/${t.id}`,
      body: patch,
      entity: { kind: "template", id: t.id },
      apply: (x) => ({ ...x, templates: x.templates.map((i) => (i.id === t.id ? t : i)) }),
    });
  }

  for (const t of base.templates) {
    if (nextIds.has(t.id)) continue;
    ops.push({
      method: "DELETE",
      path: `/api/admin/templates/${t.id}`,
      entity: { kind: "template", id: t.id },
      apply: (x) => ({ ...x, templates: x.templates.filter((i) => i.id !== t.id) }),
    });
  }
  return ops;
}

/** Requests to run, in order, to bring the server from `base` to `next`. Empty when nothing valid changed. */
export function planSync(base: ProjectBundle, next: ProjectBundle, moves: StageMoves = new Map()): SyncOp[] {
  return [...projectOps(base, next), ...stageOps(base, next, moves), ...questionOps(base, next), ...templateOps(base, next)];
}
