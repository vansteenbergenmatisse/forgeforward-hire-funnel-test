import { describe, expect, it } from "vitest";
import { BLANK_PROJECT_DEF, DEFAULT_STAGES, type ProjectBundle, type QuestionDef, type StageDef, type TemplateDef } from "@/features/projects";
import { planSync, type SyncOp } from "./sync-plan";

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const stages: StageDef[] = DEFAULT_STAGES.map((s, i) => ({ id: uid(i + 1), name: s.name, color: s.color as StageDef["color"], isPositive: s.isPositive, role: s.role }));
const email: TemplateDef = { id: uid(100), channel: "email", name: "Invite", subject: "Hi", body: "Hi {first_name}" };

function base(): ProjectBundle {
  return { def: { ...BLANK_PROJECT_DEF, slug: "demo", name: "Demo", calLink: "https://cal.com/a/b" }, questions: [], stages, templates: [email] };
}

const paths = (ops: SyncOp[]) => ops.map((o) => `${o.method} ${o.path.replace(/[0-9a-f-]{36}/g, "ID")}`);
const run = (b: ProjectBundle, ops: SyncOp[]) => ops.reduce((acc, op) => op.apply(acc), b);

describe("planSync", () => {
  it("sends nothing when nothing changed", () => {
    expect(planSync(base(), base())).toEqual([]);
  });

  it("sends only the changed project fields in one PATCH", () => {
    const next = base();
    next.def = { ...next.def, intro: "New", status: "closed", replyDays: 9 };
    const ops = planSync(base(), next);
    expect(paths(ops)).toEqual(["PATCH /api/admin/settings/demo"]);
    expect(ops[0].body).toEqual({ intro: "New", status: "closed", replyDays: 9 });
    expect(run(base(), ops).def.replyDays).toBe(9);
  });

  it("holds back invalid values until they are valid", () => {
    const next = base();
    next.def = { ...next.def, name: "  ", replyDays: 99, calLink: "nonsense", thankYouText: "Hi {bad}", prepSeconds: 9999 };
    expect(planSync(base(), next)).toEqual([]);
  });

  it("normalizes the cal link and allows clearing it", () => {
    const next = base();
    next.def = { ...next.def, calLink: "cal.com/x/y" };
    expect(planSync(base(), next)[0].body).toEqual({ calLink: "https://cal.com/x/y" });
    next.def = { ...next.def, calLink: "" };
    expect(planSync(base(), next)[0].body).toEqual({ calLink: "" });
  });

  it("holds back an incomplete task that is turned on, and sends a complete one together", () => {
    const next = base();
    next.def = { ...next.def, taskEnabled: true };
    expect(planSync(base(), next)).toEqual([]);
    next.def = { ...next.def, taskTitle: "Task", taskBody: "<p>Do it</p>" };
    const ops = planSync(base(), next);
    expect(ops[0].body).toEqual({ taskEnabled: true, taskTitle: "Task", taskBody: "<p>Do it</p>" });
  });

  it("creates, renames, deletes and reorders stages in order", () => {
    const next = base();
    const added: StageDef = { id: uid(50), name: "New stage", color: "gray", isPositive: false, role: null };
    next.stages = [added, ...stages.filter((s) => s.id !== uid(7)).map((s) => (s.id === uid(4) ? { ...s, name: "Talked" } : s))];
    const ops = planSync(base(), next, new Map([[uid(7), uid(1)]]));
    expect(paths(ops)).toEqual(["POST /api/admin/stages", "PATCH /api/admin/stages/ID", "DELETE /api/admin/stages/ID?moveTo=ID", "POST /api/admin/stages/reorder"]);
    const after = run(base(), ops);
    expect(after.stages.map((s) => s.id)).toEqual(next.stages.map((s) => s.id));
    expect(after.stages.find((s) => s.id === uid(4))?.name).toBe("Talked");
    expect(planSync(after, next)).toEqual([]);
  });

  it("sends one request for a role swap", () => {
    const next = base();
    next.stages = stages.map((s) => (s.id === uid(1) ? { ...s, role: "entry_task" } : s.id === uid(2) ? { ...s, role: "entry_new" } : s));
    const ops = planSync(base(), next);
    expect(ops).toHaveLength(1);
    expect(ops[0].body).toEqual({ role: "entry_task" });
    expect(run(base(), ops).stages).toEqual(next.stages);
  });

  it("does not send a duplicate stage name", () => {
    const next = base();
    next.stages = stages.map((s) => (s.id === uid(4) ? { ...s, name: "new" } : s));
    expect(planSync(base(), next)).toEqual([]);
  });

  it("creates questions only when valid, and archive is a flag", () => {
    const q: QuestionDef = { id: uid(200), label: "Years?", helpText: "", type: "single_choice", options: ["A", "B"], required: true, archived: false };
    const draft = base();
    draft.questions = [{ ...q, options: ["A"] }];
    expect(planSync(base(), draft)).toEqual([]);
    const withQ = base();
    withQ.questions = [q];
    const ops = planSync(base(), withQ);
    expect(paths(ops)).toEqual(["POST /api/admin/questions"]);
    const synced = run(base(), ops);
    const archived = { ...synced, questions: [{ ...q, archived: true }] };
    const ops2 = planSync(synced, archived);
    expect(paths(ops2)).toEqual(["PATCH /api/admin/questions/ID"]);
    expect(ops2[0].body).toEqual({ archived: true });
  });

  it("reorders questions", () => {
    const q1: QuestionDef = { id: uid(201), label: "A", helpText: "", type: "short_text", options: [], required: false, archived: false };
    const q2: QuestionDef = { ...q1, id: uid(202), label: "B" };
    const b = { ...base(), questions: [q1, q2] };
    const ops = planSync(b, { ...b, questions: [q2, q1] });
    expect(paths(ops)).toEqual(["POST /api/admin/questions/reorder"]);
    expect(ops[0].body).toEqual({ projectSlug: "demo", ids: [q2.id, q1.id] });
  });

  it("creates a template only when valid, patches changes and deletes", () => {
    const blank: TemplateDef = { id: uid(101), channel: "sms", name: "New template", subject: "", body: "" };
    const withBlank = { ...base(), templates: [email, blank] };
    expect(planSync(base(), withBlank)).toEqual([]);
    const filled = { ...base(), templates: [email, { ...blank, body: "Hi {first_name}" }] };
    expect(paths(planSync(base(), filled))).toEqual(["POST /api/admin/templates"]);
    const edited = { ...base(), templates: [{ ...email, body: "Changed {cal_link}" }] };
    expect(planSync(base(), edited)[0].body).toEqual({ body: "Changed {cal_link}" });
    const removed = { ...base(), templates: [] };
    expect(paths(planSync(base(), removed))).toEqual(["DELETE /api/admin/templates/ID"]);
    const badVar = { ...base(), templates: [{ ...email, body: "Hi {nope}" }] };
    expect(planSync(base(), badVar)).toEqual([]);
  });
});
