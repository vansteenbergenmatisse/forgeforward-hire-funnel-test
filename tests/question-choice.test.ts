import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db, tables } from "@/platform/db";

const haveDb = Boolean(process.env.TEST_DATABASE_URL);
if (haveDb) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.ADMIN_KEY ||= "t".repeat(48);

const suffix = crypto.randomUUID().slice(0, 8);

describe.skipIf(!haveDb)("Choose one and Choose several questions", { timeout: 60_000 }, () => {
  let projects: typeof import("@/features/projects/server");
  let funnel: typeof import("@/features/applicant-funnel/server");
  let slug = "";
  let projectId = "";

  beforeAll(async () => {
    projects = await import("@/features/projects/server");
    funnel = await import("@/features/applicant-funnel/server");
    const p = await projects.createProject({ name: `Zz choice ${suffix}`, mode: "blank" });
    slug = p.def.slug;
    const [row] = await db().select({ id: tables.projects.id }).from(tables.projects).where(eq(tables.projects.slug, slug));
    projectId = row.id;
  });

  afterAll(async () => {
    if (projectId) await db().delete(tables.projects).where(eq(tables.projects.id, projectId));
    await closeDb();
  });

  const start = (answers: Record<string, string | string[]>, n: number) =>
    funnel.startApplication(
      new Request("http://x/api/apply/start", { method: "POST", headers: { "x-forwarded-for": `192.0.2.${n}-${suffix}` } }),
      {
        projectSlug: slug,
        firstName: "Ana",
        lastName: "Choice",
        email: `choice-${n}-${suffix}@example.com`,
        phone: "(415) 555-2671",
        phoneCountry: "US",
        whatsappOk: true,
        timezone: "America/New_York",
        consent: true,
        answers,
        utm: {},
        inAppBrowser: false,
      },
      `key-${crypto.randomUUID()}`,
    ) as Promise<{ applicant_id: string }>;

  it("creates a Choose one question with its options in order", async () => {
    const q = await projects.createQuestion({ projectSlug: slug, label: "How long?", type: "single_choice", options: ["Under 1 year", "1 to 3 years", "3 years or more"], required: true, helpText: "" });
    expect(q.type).toBe("single_choice");
    expect(q.options).toEqual(["Under 1 year", "1 to 3 years", "3 years or more"]);
  });

  it("needs two different options, drops blanks and repeats", async () => {
    await expect(projects.createQuestion({ projectSlug: slug, label: "One?", type: "single_choice", options: ["Only"], required: false, helpText: "" })).rejects.toMatchObject({ code: "invalid_options" });
    await expect(projects.createQuestion({ projectSlug: slug, label: "Same?", type: "single_choice", options: ["A", " a "], required: false, helpText: "" })).rejects.toMatchObject({ code: "invalid_options" });
    const q = await projects.createQuestion({ projectSlug: slug, label: "Clean?", type: "single_choice", options: [" A ", "", "B", "b", "C"], required: false, helpText: "" });
    expect(q.options).toEqual(["A", "B", "C"]);
  });

  it("keeps the options when the type switches between Choose one and Choose several", async () => {
    const q = await projects.createQuestion({ projectSlug: slug, label: "Switch?", type: "single_choice", options: ["X", "Y", "Z"], required: false, helpText: "" });
    const multi = await projects.updateQuestion(q.id, { type: "multi_choice" });
    expect(multi).toMatchObject({ type: "multi_choice", options: ["X", "Y", "Z"] });
    const back = await projects.updateQuestion(q.id, { type: "single_choice" });
    expect(back).toMatchObject({ type: "single_choice", options: ["X", "Y", "Z"] });
    // Reordering the options is a plain update of the list.
    expect((await projects.updateQuestion(q.id, { options: ["Z", "X", "Y"] })).options).toEqual(["Z", "X", "Y"]);
  });

  it("stores a Choose one answer as a string and a Choose several answer as an array", async () => {
    const one = await projects.createQuestion({ projectSlug: slug, label: "Pick one", type: "single_choice", options: ["Red", "Green", "Blue"], required: true, helpText: "" });
    const many = await projects.createQuestion({ projectSlug: slug, label: "Pick several", type: "multi_choice", options: ["Mon", "Tue", "Wed"], required: false, helpText: "" });
    const existing = await db().select().from(tables.projectQuestions).where(eq(tables.projectQuestions.projectId, projectId));
    // Questions made by the earlier tests are optional or archived-free; answer only the required ones.
    const requiredIds = existing.filter((q) => q.required && q.id !== one.id).map((q) => q.id);
    const base: Record<string, string> = Object.fromEntries(requiredIds.map((id) => [id, "1 to 3 years"]));

    const a = await start({ ...base, [one.id]: "Green", [many.id]: ["Mon", "Wed"] }, 1);
    const [row] = await db().select().from(tables.applicants).where(eq(tables.applicants.id, a.applicant_id));
    expect(row.answers[one.id]).toEqual({ label: "Pick one", type: "single_choice", value: "Green" });
    expect(row.answers[many.id]).toEqual({ label: "Pick several", type: "multi_choice", value: ["Mon", "Wed"] });

    // A list for Choose one, or an option that does not exist, is refused. A required Choose one cannot be left empty.
    await expect(start({ ...base, [one.id]: ["Green"] as never }, 2)).rejects.toMatchObject({ status: 400 });
    await expect(start({ ...base, [one.id]: "Purple" }, 3)).rejects.toMatchObject({ status: 400 });
    await expect(start({ ...base }, 4)).rejects.toMatchObject({ status: 400 });
  });
});
