import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { signTestConsole, TEST_CONSOLE_HEADER } from "../../src/features/applicant-funnel/server/bypass";
import { adminApi } from "./admin";
import { BASE_URL, PROJECT_SLUG, dbUrl, secret } from "./env";

type AdminApplicant = {
  id: string;
  email: string;
  isTest: boolean;
  stageId: string | null;
  funnelStep: string;
  didTask: boolean;
  audioOnly: boolean;
  answers: Record<string, { label: string; value: unknown }>;
  media: { kind: "video" | "audio"; bytes: number; seconds: number; deletedAt: string | null } | null;
};

const rand = () => randomBytes(4).toString("hex");

/** Signs a FRESH test-console header for every same-origin /api/apply request. Cross-origin requests (the R2 PUT) are untouched. */
async function flagAsTest(page: Page) {
  const adminKey = secret("ADMIN_KEY");
  const origin = new URL(BASE_URL).origin;
  await page.route(
    (url) => url.origin === origin && url.pathname.startsWith("/api/apply/"),
    (route) => route.continue({ headers: { ...route.request().headers(), [TEST_CONSOLE_HEADER]: signTestConsole(adminKey) } }),
  );
}

async function fillForm(page: Page, first: string, email: string) {
  await page.getByLabel("First name", { exact: true }).fill(first);
  await page.getByLabel("Last name", { exact: true }).fill("Devicecheck");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Phone", { exact: true }).fill("(415) 555-2671");
  await page.getByText("Yes", { exact: true }).first().click();
  await page.getByText("3 to 5 years", { exact: true }).click(); // the radio input is visually hidden
  await page.getByText("I agree that Forge Forward").click();
}

test("application reaches the database, R2 and the dashboard", async ({ page, context }, testInfo) => {
  const device = testInfo.project.name;
  const skipTask = (testInfo.project.metadata as { skipTask: boolean }).skipTask;
  const first = "Device";
  const email = `e2e-${device}-${rand()}@example.test`;
  const note = (type: string, description: string) => testInfo.annotations.push({ type, description });

  // The raw resume token, kept only to prove it is never stored in clear text.
  let resumeToken = "";
  let applicantId = "";
  page.on("response", async (res) => {
    if (res.url().endsWith("/api/apply/start") && res.ok()) {
      const body = (await res.json().catch(() => null)) as { applicant_id?: string; resume_token?: string } | null;
      if (body?.applicant_id) applicantId = body.applicant_id;
      if (body?.resume_token) resumeToken = body.resume_token;
    }
  });
  await flagAsTest(page);

  // 1. Funnel: form, camera, record, upload, task, thank you.
  await page.goto(`/a/${PROJECT_SLUG}`);
  await expect(page.getByRole("heading", { name: "Appointment Setter" })).toBeVisible();
  await fillForm(page, first, email);
  await page.getByRole("button", { name: /Next: your video/ }).click();

  await page.getByRole("button", { name: "Turn on camera" }).click();
  const camera = page.getByRole("heading", { name: "Looking good" });
  const noCamera = page.getByRole("heading", { name: "No camera? No problem" });
  const blocked = page.getByRole("heading", { name: "Your camera is blocked" });
  await expect(camera.or(noCamera).or(blocked)).toBeVisible({ timeout: 30_000 });
  if (await blocked.isVisible()) {
    note("camera", "camera not testable: permission blocked, no media recorded");
    throw new Error("Camera and microphone are blocked on this device; the video step cannot run.");
  }
  if (await noCamera.isVisible()) note("camera", "camera not testable here: audio-only fallback used (no video track)");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "I'm ready" }).click();
  // The app keeps Finish disabled for the first 10 seconds, so the real take is about 11 seconds.
  const finish = page.getByRole("button", { name: "Finish" });
  await expect(finish).toBeEnabled({ timeout: 40_000 });
  await finish.click();
  await expect(page.getByRole("heading", { name: "How did that look?" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Use this video" }).click();

  await expect(page.getByRole("heading", { name: /Optional task/ })).toBeVisible({ timeout: 90_000 });
  if (skipTask) {
    await page.getByRole("button", { name: "Skip task" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Skip task" }).click();
  } else {
    await page.getByLabel("Your text").fill(`Hi, this is the ${device} device check.`);
    await page.getByRole("button", { name: "Submit task" }).click();
  }
  await expect(page.getByRole("heading", { name: `Thanks, ${first}` })).toBeVisible({ timeout: 30_000 });
  expect(applicantId, "the start call returned an applicant id").not.toBe("");

  // 2. Database through the admin API. The response only has the rows of this email.
  const api = await adminApi();
  try {
    const list = await api.get(`/api/admin/applicants?project=${PROJECT_SLUG}&includeTest=1&q=${encodeURIComponent(email)}`);
    expect(list.ok()).toBeTruthy();
    const { applicants } = (await list.json()) as { applicants: AdminApplicant[] };
    const a = applicants.find((x) => x.id === applicantId);
    expect(a, "applicant visible through GET /api/admin/applicants").toBeDefined();
    if (!a) return;
    expect(a.email).toBe(email);
    expect(a.isTest, "flagged is_test").toBe(true);
    expect(a.funnelStep).toBe("completed");
    expect(a.stageId, "a stage is assigned").not.toBeNull();
    expect(a.didTask).toBe(!skipTask);
    expect(Object.values(a.answers).map((x) => x.value).join("|")).toMatch(/3 to 5 years/);
    expect(a.media, "video saved").not.toBeNull();
    expect(a.media?.deletedAt ?? null).toBeNull();
    expect(a.media?.bytes ?? 0).toBeGreaterThan(0);
    if (a.audioOnly) note("camera", "saved as audio only");

    // Same facts straight from Postgres when the target database URL is available.
    const url = dbUrl();
    if (url) {
      const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 5 });
      try {
        const [r] = await sql`select is_test, funnel_step, video_key, video_bytes, audio_only, did_task, stage_id, answers::text as answers, resume_token_hash
          from applicants where id = ${applicantId}`;
        expect(r, "row exists in Postgres").toBeDefined();
        expect(r.is_test).toBe(true);
        expect(r.funnel_step).toBe("completed");
        expect(r.video_key).toBeTruthy();
        expect(Number(r.video_bytes)).toBeGreaterThan(0);
        expect(Number(r.video_bytes)).toBe(a.media?.bytes);
        expect(r.stage_id).toBeTruthy();
        expect(r.did_task).toBe(!skipTask);
        expect(r.answers).toContain("3 to 5 years");
        expect(r.resume_token_hash).not.toBe(resumeToken);
        const [leak] = await sql`select
          (select count(*) from applicants where to_jsonb(applicants)::text like ${"%" + resumeToken + "%"}) +
          (select count(*) from applicant_events where to_jsonb(applicant_events)::text like ${"%" + resumeToken + "%"}) as n`;
        expect(Number(leak.n), "no plaintext resume token stored").toBe(0);
      } finally {
        await sql.end({ timeout: 5 });
      }
    } else {
      note("db", "direct Postgres check skipped: DATABASE_URL_UNPOOLED not set");
    }

    // 3. R2: the signed media URL answers with the declared size. A range GET, because the URL is signed for GET.
    const signed = await api.get(`/api/admin/applicants/${applicantId}/media?kind=video&format=json`);
    expect(signed.ok()).toBeTruthy();
    const { url: mediaUrl } = (await signed.json()) as { url: string };
    const head = await fetch(mediaUrl, { headers: { range: "bytes=0-0" } });
    expect([200, 206]).toContain(head.status);
    const total = head.status === 206 ? Number(/\/(\d+)$/.exec(head.headers.get("content-range") ?? "")?.[1]) : Number(head.headers.get("content-length"));
    await head.arrayBuffer();
    expect(total, "R2 object size equals the saved size").toBe(a.media?.bytes);
  } finally {
    await api.dispose();
  }

  // 4. Dashboard in this same browser: password login, show-test board, card in the right stage, player can load the file.
  const login = await context.request.post("/adminMatt/login/submit", { data: { password: secret("ADMIN_PASSWORD") }, headers: { origin: BASE_URL } });
  expect(login.ok(), "password login in the browser context").toBeTruthy();
  const expectedStage = skipTask ? "New" : "Did task";
  if (process.env.E2E_SKIP_BOARD === "1") {
    // The target site has not deployed the admin-only ?test=1 board option yet; the drawer below still works.
    note("board", "board card check skipped: target does not have the ?test=1 option deployed");
  } else {
    await page.goto(`/adminMatt/p/${PROJECT_SLUG}?test=1`);
    const card = page.locator(`[data-card-id="${applicantId}"]`);
    await expect(card).toBeAttached({ timeout: 30_000 });
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    const column = page.locator("section[aria-label]").filter({ has: card });
    await expect(column).toHaveAttribute("aria-label", new RegExp(`^${expectedStage}, `));
  }

  await page.goto(`/adminMatt/p/${PROJECT_SLUG}?test=1&a=${applicantId}`);
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  const picker = drawer.getByRole("combobox").first();
  await expect(picker.locator("option:checked")).toHaveText(expectedStage);
  const media = drawer.locator("video, audio").first();
  await expect(media).toHaveAttribute("src", /\/api\/admin\/applicants\/.+\/media/);
  const canPlay = await media.evaluate((el) => {
    const m = el as HTMLMediaElement;
    // The server stores the recorded mime; ask the browser whether it can decode the container it got.
    return { video: m.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') || m.canPlayType("video/webm"), tag: m.tagName };
  });
  const decodeFailed = drawer.getByText("This browser cannot play the file.");
  try {
    await expect
      .poll(async () => media.evaluate((el) => (el as HTMLMediaElement).readyState >= 1 && ((el as HTMLMediaElement).duration > 0 || (el as HTMLMediaElement).duration === Infinity)), { timeout: 30_000 })
      .toBe(true);
  } catch (e) {
    if (await decodeFailed.isVisible().catch(() => false)) {
      note("player", `${device} cannot decode its own recording (canPlayType "${canPlay.video}")`);
    }
    throw e;
  }
  await drawer.screenshot({ path: testInfo.outputPath("drawer.png") });
});
