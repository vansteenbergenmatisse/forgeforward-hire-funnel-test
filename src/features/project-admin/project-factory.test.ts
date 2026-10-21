import { describe, expect, it } from "vitest";
import { DEFAULT_STAGES } from "@/features/projects";
import { blankProject, duplicateProject, slugify, uniqueSlug } from "./project-factory";
import { INITIAL_PROJECTS } from "./mock";

describe("slugs", () => {
  it("slugifies", () => {
    expect(slugify("  Sales Rep! ")).toBe("sales-rep");
    expect(slugify("Café Manager")).toBe("cafe-manager");
    expect(slugify("!!!")).toBe("project");
  });
  it("keeps slugs unique", () => {
    expect(uniqueSlug("Sales Rep", ["sales-rep"])).toBe("sales-rep-2");
    expect(uniqueSlug("Sales Rep", ["sales-rep", "sales-rep-2"])).toBe("sales-rep-3");
    expect(uniqueSlug("Closer", ["sales-rep"])).toBe("closer");
  });
});

describe("blankProject", () => {
  const p = blankProject("Closer", ["sales-rep"]);
  it("uses default stages and no questions", () => {
    expect(p.def.slug).toBe("closer");
    expect(p.questions).toEqual([]);
    expect(p.stages.map((s) => s.name)).toEqual(DEFAULT_STAGES.map((s) => s.name));
    expect(p.stages.filter((s) => s.role).map((s) => s.role)).toEqual(["entry_new", "entry_task", "on_booking"]);
  });
  it("starts open with a thank-you text", () => {
    expect(p.def.status).toBe("open");
    expect(p.def.thankYouText.length).toBeGreaterThan(0);
    expect(p.templates).toHaveLength(3);
  });
});

describe("duplicateProject", () => {
  const source = INITIAL_PROJECTS[0];
  const copy = duplicateProject(source, "Appointment Setter", INITIAL_PROJECTS.map((r) => r.def.slug));
  it("copies content with a fresh slug and ids", () => {
    expect(copy.def.slug).toBe("appointment-setter-2");
    expect(copy.def.videoPrompt).toBe(source.def.videoPrompt);
    expect(copy.def.taskBody).toBe(source.def.taskBody);
    expect(copy.def.thankYouText).toBe(source.def.thankYouText);
    expect(copy.questions).toEqual(source.questions);
    expect(copy.questions[0].options).not.toBe(source.questions[0].options);
    expect(copy.templates.map((t) => t.body)).toEqual(source.templates.map((t) => t.body));
    expect(copy.stages.map((s) => s.name)).toEqual(source.stages.map((s) => s.name));
    expect(copy.stages.map((s) => s.id)).not.toContain(source.stages[0].id);
    expect(new Set(copy.stages.map((s) => s.id)).size).toBe(copy.stages.length);
  });
});
