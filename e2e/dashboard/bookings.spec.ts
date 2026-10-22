import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import * as schema from "../../src/platform/db/schema";
import { calBody, cleanup, createProject, insertApplicant, rand, sign, signIn, stageOf, testDb, type E2eProject } from "./helpers";

let project: E2eProject;
const uids: string[] = [];
const uid = (tag: string) => {
  const u = `e2e-${tag}-${rand()}`;
  uids.push(u);
  return u;
};

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  project = await createProject(page, "bookings");
  await page.close();
});

test.afterAll(async () => {
  await cleanup([project], uids);
});

const onBooking = () => project.stages.find((s) => s.role === "on_booking")!;
const events = async (applicantId: string) =>
  testDb().select().from(schema.applicantEvents).where(eq(schema.applicantEvents.applicantId, applicantId));

test.describe("Cal.com webhook", () => {
  test("unsigned and wrongly signed requests are rejected", async ({ request }) => {
    const a = await insertApplicant(project, project.stages[0].id, "unsigned");
    const body = calBody({ uid: uid("unsigned"), email: a.email, applicantId: a.id });
    expect((await request.post("/api/webhooks/calcom", { data: body })).status()).toBe(401);
    const bad = await request.post("/api/webhooks/calcom", { data: body, headers: { "x-cal-signature-256": "0".repeat(64) } });
    expect(bad.status()).toBe(401);
    const wrongSecret = await request.post("/api/webhooks/calcom", { data: body, headers: { "x-cal-signature-256": sign(body, "not-the-secret") } });
    expect(wrongSecret.status()).toBe(401);
    expect(await stageOf(a.id)).toBe(project.stages[0].id);
    expect((await events(a.id)).length).toBe(0);
  });

  test("a signed booking moves the card, and a duplicate acts once", async ({ request, page }) => {
    const a = await insertApplicant(project, project.stages[0].id, "signed");
    const body = calBody({ uid: uid("signed"), email: a.email, applicantId: a.id });
    const headers = { "x-cal-signature-256": sign(body) };

    const first = await request.post("/api/webhooks/calcom", { data: body, headers });
    expect(first.status()).toBe(200);
    expect(await first.json()).toMatchObject({ result: "applied" });
    expect(await stageOf(a.id)).toBe(onBooking().id);

    const second = await request.post("/api/webhooks/calcom", { data: body, headers });
    expect(second.status()).toBe(200);
    expect(await second.json()).toMatchObject({ result: "duplicate" });

    const ev = await events(a.id);
    expect(ev.filter((e) => e.type === "booking_created")).toHaveLength(1);
    expect(ev.filter((e) => e.type === "stage_changed")).toHaveLength(1);

    // The board shows the card in the booking stage after a reload.
    await signIn(page);
    await page.goto(`/adminMatt/p/${project.slug}`);
    await expect(page.locator(`[data-card-id="${a.id}"]`)).toHaveAttribute("aria-label", new RegExp(`, ${onBooking().name}$`));
  });
});

test.describe("unmatched bookings", () => {
  test("link an unmatched booking to an applicant, and dismiss another", async ({ request, page }) => {
    const a = await insertApplicant(project, project.stages[0].id, "link");
    const linkEmail = `e2e-nomatch-${rand()}@example.test`;
    const dismissEmail = `e2e-dismiss-${rand()}@example.test`;

    for (const email of [linkEmail, dismissEmail]) {
      const body = calBody({ uid: uid("unmatched"), email });
      const res = await request.post("/api/webhooks/calcom", { data: body, headers: { "x-cal-signature-256": sign(body) } });
      expect(await res.json()).toMatchObject({ result: "unmatched" });
    }

    await signIn(page);
    await page.goto("/adminMatt");
    const box = page.getByRole("region", { name: "Unmatched bookings" });
    await expect(box.getByText(linkEmail)).toBeVisible();
    await expect(box.getByText(dismissEmail)).toBeVisible();

    // Dismiss.
    await box.locator("li", { hasText: dismissEmail }).getByRole("button", { name: "Dismiss" }).click();
    await expect(box.locator("li", { hasText: dismissEmail })).toHaveCount(0);

    // Link.
    await box.locator("li", { hasText: linkEmail }).getByRole("button", { name: "Link to applicant" }).click();
    await page.getByRole("dialog").getByLabel("Applicant").selectOption({ value: a.id });
    await page.getByRole("dialog").getByRole("button", { name: "Link booking" }).click();
    await expect(box.getByText(/Linked .* to /)).toBeVisible();
    await expect(box.locator("li", { hasText: linkEmail })).toHaveCount(0);

    await expect.poll(() => stageOf(a.id)).toBe(onBooking().id);
    const [row] = await testDb().select().from(schema.applicants).where(eq(schema.applicants.id, a.id));
    expect(row.booking?.status).toBe("booked");

    // Both rows stay gone after a reload.
    await page.reload();
    await expect(page.getByText(linkEmail)).toHaveCount(0);
    await expect(page.getByText(dismissEmail)).toHaveCount(0);
  });
});
