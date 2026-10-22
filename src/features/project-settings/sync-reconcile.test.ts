import { describe, expect, it } from "vitest";
import { BLANK_PROJECT_DEF, DEFAULT_STAGES, type ProjectBundle, type QuestionDef, type StageDef } from "@/features/projects";
import { KEEPALIVE_MAX_BYTES, fitsKeepalive, isRefusal, reconcileRefused } from "./sync-reconcile";

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const stages: StageDef[] = DEFAULT_STAGES.map((s, i) => ({ id: uid(i + 1), name: s.name, color: s.color as StageDef["color"], isPositive: s.isPositive, role: s.role }));
const q = (n: number, label: string): QuestionDef => ({ id: uid(200 + n), label, helpText: "", type: "short_text", options: [], required: false, archived: false });

const server = (): ProjectBundle => ({ def: { ...BLANK_PROJECT_DEF, slug: "demo", name: "Demo", intro: "Server intro" }, questions: [q(1, "A"), q(2, "B")], stages, templates: [] });

describe("reconcileRefused", () => {
  it("brings a deleted question back when the server refused the delete", () => {
    const local = { ...server(), questions: [q(2, "B")] };
    const out = reconcileRefused(local, server(), { kind: "question", id: uid(201) });
    expect(out.questions.map((x) => x.label)).toEqual(["A", "B"]);
  });
  it("removes a stage the server never accepted and keeps other edits", () => {
    const local: ProjectBundle = { ...server(), stages: [...stages, { id: uid(99), name: "Dup", color: "gray", isPositive: false, role: null }], def: { ...server().def, intro: "Local intro" } };
    const out = reconcileRefused(local, server(), { kind: "stage", id: uid(99) });
    expect(out.stages).toHaveLength(stages.length);
    expect(out.def.intro).toBe("Local intro");
  });
  it("puts back the server version of a refused edit", () => {
    const local = { ...server(), questions: [q(1, "Edited"), q(2, "B")] };
    const out = reconcileRefused(local, server(), { kind: "question", id: uid(201) });
    expect(out.questions[0].label).toBe("A");
  });
  it("resets only the refused project fields", () => {
    const local = { ...server(), def: { ...server().def, intro: "Local intro", name: "Local name" } };
    const out = reconcileRefused(local, server(), { kind: "project", fields: ["name"] });
    expect(out.def.name).toBe("Demo");
    expect(out.def.intro).toBe("Local intro");
  });
  it("restores the server order", () => {
    const local = { ...server(), questions: [q(2, "B"), q(1, "A")] };
    expect(reconcileRefused(local, server(), { kind: "order", list: "questions" }).questions.map((x) => x.label)).toEqual(["A", "B"]);
  });
});

describe("helpers", () => {
  it("treats 4xx (except 408 and 429) as a refusal", () => {
    expect([400, 404, 409, 422].every(isRefusal)).toBe(true);
    expect([0, 408, 429, 500, 503].some(isRefusal)).toBe(false);
  });
  it("keeps large bodies out of keepalive", () => {
    expect(fitsKeepalive({ a: 1 })).toBe(true);
    expect(fitsKeepalive(undefined)).toBe(true);
    expect(fitsKeepalive({ taskBody: "x".repeat(KEEPALIVE_MAX_BYTES + 1) })).toBe(false);
  });
});
