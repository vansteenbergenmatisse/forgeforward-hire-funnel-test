import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import * as schema from "../../src/platform/db/schema";
import { cleanup, rand, signIn, testDb, type E2eProject } from "./helpers";

// A project created from the Projects home is editable in every tab, and the edits show on its public funnel /a/<slug>.

let project: E2eProject | null = null;

test.afterAll(async () => {
  if (project) await cleanup([project]);
});

const saved = (page: Page) => expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible({ timeout: 10_000 });

test("create a project, edit it in every tab, and see the changes on its funnel", async ({ page, browser }) => {
  await signIn(page);
  const name = `E2E Edit ${rand()}`;
  const tag = rand();

  // Create from the Projects home.
  await page.goto("/adminMatt");
  await page.getByRole("button", { name: "New project" }).first().click();
  await page.getByLabel("Role name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/adminMatt\/p\/[^/]+$/);
  const slug = new URL(page.url()).pathname.split("/").pop() as string;
  const [row] = await testDb().select().from(schema.projects).where(eq(schema.projects.slug, slug));
  project = { slug, id: row.id, name, stages: [] };

  // The card has Edit project, and so does the board header.
  await page.goto("/adminMatt");
  await page.getByRole("article", { name, exact: true }).getByRole("link", { name: "Edit project" }).click();
  await expect(page).toHaveURL(new RegExp(`/adminMatt/p/${slug}/settings`));
  await page.goto(`/adminMatt/p/${slug}`);
  await page.getByRole("link", { name: "Edit project" }).click();
  await expect(page).toHaveURL(new RegExp(`/adminMatt/p/${slug}/settings`));

  // General: intro.
  const intro = `Intro ${tag}: call warm leads all day.`;
  await page.goto(`/adminMatt/p/${slug}/settings?tab=general`);
  await page.getByLabel("Intro paragraph").fill(intro);
  await saved(page);

  // Video: prompt and max recording seconds.
  const prompt = `Prompt ${tag}: tell us about a hard call.`;
  await page.goto(`/adminMatt/p/${slug}/settings?tab=video`);
  await page.getByLabel("Prompt", { exact: true }).fill(prompt);
  await page.getByLabel(/Max recording/).fill("90");
  await saved(page);

  // Questions: add one.
  const question = `Question ${tag}: favourite tool?`;
  await page.goto(`/adminMatt/p/${slug}/settings?tab=questions`);
  await page.getByRole("button", { name: "Add question" }).click();
  await page.getByLabel("Question", { exact: true }).fill(question);
  await page.getByRole("button", { name: "Save question" }).click();

  // Stages: rename one.
  await page.goto(`/adminMatt/p/${slug}/settings?tab=stages`);
  const stageName = `Stage ${tag}`;
  const first = page.getByLabel(/^Name of stage /).nth(3);
  await first.fill(stageName);
  await saved(page);

  // Task: on, with a title and a body.
  const taskTitle = `Task ${tag}`;
  const taskText = `Write a first text ${tag}`;
  await page.goto(`/adminMatt/p/${slug}/settings?tab=task`);
  const toggle = page.getByRole("switch", { name: /Task is/ });
  if (!(await toggle.isChecked())) await toggle.check({ force: true });
  await page.getByLabel("Title", { exact: true }).fill(taskTitle);
  const editor = page.getByRole("textbox", { name: "Task" });
  await editor.click();
  await page.keyboard.type(taskText);
  await saved(page);

  // Thank-you text and reply window.
  const thanks = `Thanks ${tag}, {first_name}. We answer in {reply_days} days.`;
  await page.goto(`/adminMatt/p/${slug}/settings?tab=thankyou`);
  await page.getByLabel("Text", { exact: true }).fill(thanks);
  await saved(page);
  await page.goto(`/adminMatt/p/${slug}/settings?tab=general`);
  await page.getByLabel("Reply within").fill("7");
  await saved(page);

  // Everything reached the database.
  await expect
    .poll(async () => {
      const [p] = await testDb().select().from(schema.projects).where(eq(schema.projects.id, row.id));
      const qs = await testDb().select().from(schema.projectQuestions).where(eq(schema.projectQuestions.projectId, row.id));
      const st = await testDb().select().from(schema.stages).where(eq(schema.stages.projectId, row.id));
      return [p.intro === intro, p.videoPrompt === prompt, p.maxRecordSeconds === 90, p.taskEnabled, p.taskTitle === taskTitle, p.thankYouText === thanks, p.replyDays === 7, qs.some((q) => q.label === question), st.some((s) => s.name === stageName)];
    })
    .toEqual(Array(9).fill(true));

  // The public funnel shows it: heading (the project name), intro, the new question.
  const visitor = await browser.newPage();
  await visitor.goto(`/a/${slug}`);
  await expect(visitor.getByRole("heading", { name })).toBeVisible();
  await expect(visitor.getByText(intro)).toBeVisible();
  await expect(visitor.getByText(question)).toBeVisible();

  // Video prompt, task and thank-you on the review screens, which render the live project.
  await visitor.goto(`/a/${slug}?step=A04`);
  await expect(visitor.getByRole("heading", { name: "Next: a 90 second video" })).toBeVisible();
  await visitor.goto(`/a/${slug}?step=A09`);
  await expect(visitor.getByText(prompt)).toBeVisible();
  await visitor.goto(`/a/${slug}?step=A14`);
  await expect(visitor.getByText(taskTitle)).toBeVisible();
  await expect(visitor.getByText(taskText)).toBeVisible();
  await visitor.goto(`/a/${slug}?step=A16`);
  await expect(visitor.getByRole("heading", { name: new RegExp(`Thanks ${tag}, Sam`) })).toBeVisible();
  await expect(visitor.getByText("We answer in 7 days.")).toBeVisible();

  // Slug change warns first, then the old link stops working.
  await page.goto(`/adminMatt/p/${slug}/settings?tab=general`);
  await page.getByRole("button", { name: "Change slug" }).click();
  const newSlug = `${slug}-v2`;
  await page.getByRole("textbox", { name: "Link slug" }).fill(newSlug);
  await page.getByRole("button", { name: "Review change" }).click();
  await expect(page.getByRole("dialog").getByText("Links you already shared stop working.")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Change slug" }).click();
  await expect(page).toHaveURL(new RegExp(`/p/${newSlug}/settings`));
  await visitor.goto(`/a/${slug}`);
  await expect(visitor.getByText("This page does not exist.")).toBeVisible();
  await visitor.goto(`/a/${newSlug}`);
  await expect(visitor.getByRole("heading", { name })).toBeVisible();
  await visitor.close();
});
