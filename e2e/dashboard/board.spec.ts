import { expect, test } from "@playwright/test";
import { cleanup, createProject, insertApplicant, signIn, stageOf, type E2eProject } from "./helpers";

let project: E2eProject;
let applicantId: string;
let firstName: string;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  project = await createProject(page, "board");
  await page.close();
  const a = await insertApplicant(project, project.stages[0].id, "drag");
  applicantId = a.id;
  firstName = a.firstName;
});

test.afterAll(async () => {
  await cleanup([project]);
});

test("no 'not found' flash while projects load", async ({ page }) => {
  await signIn(page);
  const seen: string[] = [];
  await page.exposeFunction("report", (t: string) => seen.push(t));
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.body?.innerText.toLowerCase().includes("not found")) void (window as unknown as { report: (t: string) => void }).report("not found");
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });
  await page.goto(`/adminMatt/p/${project.slug}`);
  await expect(page.getByRole("group", { name: "Pipeline board" })).toBeVisible();
  expect(seen).toEqual([]);
});

test("a dragged card keeps its stage after reload (DB uuid stage ids)", async ({ page }) => {
  await signIn(page);
  await page.goto(`/adminMatt/p/${project.slug}`);
  const card = page.locator(`[data-card-id="${applicantId}"]`);
  await expect(card).toBeVisible();
  const target = project.stages[1];
  const column = page.locator(`section[aria-label^="${target.name},"]`);
  const from = await card.boundingBox();
  const to = await column.boundingBox();
  if (!from || !to) throw new Error("no boxes");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + 80, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => stageOf(applicantId)).toBe(target.id);
  await page.reload();
  await expect(page.locator(`[data-card-id="${applicantId}"]`)).toHaveAttribute("aria-label", `${firstName} Person, ${target.name}`);
  expect(await stageOf(applicantId)).toBe(target.id);
});
