# NEXT STEPS

Last updated: 2026-10-21. This is the single list of what is left. Read it together with CLAUDE.md (how the repo works) and PLAN.md (progress and deviations).

State in one line: the full front-end is built and pushed, running on mock data. The backend is not built because it needs keys and a Vercel login and a Postgres database.

---

## A. What YOU need to do

Order matters. Items marked SLOW have a waiting period, so start them first.

### 1. Now (unblocks me completely for Phase 1 and 2)

| # | Task | How |
|---|---|---|
| A1 | Create `.env` in the project folder with the values below. Do not paste secrets in chat. | Copy `.env.example` to `.env` and fill it in. |
| A2 | `DATABASE_URL` | Vercel dashboard, Storage (Marketplace), add Neon Postgres to the project. Copy the pooled connection string. (Or paste any other Postgres URL if you prefer to keep the existing Railway database.) |
| A3 | `R2_ACCOUNT_ID` | Cloudflare dashboard, R2, the Account ID on the overview page. |
| A4 | `R2_BUCKET` | R2, Create bucket (for example `forge-hire`). Keep it private. |
| A5 | `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` | R2, Manage API Tokens, Create API token, permission "Object Read & Write", limited to that bucket. The secret shows once. |
| A6 | Log in to Vercel | In Claude Code type `! vercel login`, then `! vercel link` in the project folder (team and project name). |

I create `TEST_DATABASE_URL` (a second Neon branch or database) and `ADMIN_KEY` myself.

### 2. At deploy (end of Phase 2)

| # | Task | How |
|---|---|---|
| A7 | Add the DNS record for `apply.forgeforward.io` | I will give you the exact record from Vercel (Project, Settings, Domains). Add it where your DNS is managed. |
| A8 | Tell me if you want a different domain | Otherwise `apply.forgeforward.io`. |

### 3. Start early because they are SLOW

| # | Task | How |
|---|---|---|
| A9 SLOW | Verify your sending domain in Resend | resend.com, Domains, add the domain, add the DNS records. DNS can take hours. Then create an API key. Needs `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`. |
| A10 SLOW | Submit the WhatsApp template "Interview invite" for approval | Meta WhatsApp Manager, Message templates. Variables in order: `first_name`, `cal_link`. Meta approval can take hours or days. Until it is approved WhatsApp runs in link mode. Name it `interview_invite`, language `en`, or tell me what you chose. |
| A11 | WhatsApp Cloud API credentials | Meta for Developers, your app, WhatsApp, API Setup: `WA_PHONE_NUMBER_ID`. Make a permanent token through a System User: `WA_ACCESS_TOKEN`. App Settings, Basic: `WA_APP_SECRET`. `WA_VERIFY_TOKEN` is any random string (I generate it, you paste it into Meta's webhook setup). |
| A12 | GoHighLevel | Settings, Private Integrations, create one with contacts and conversations/messages scopes: `GHL_PRIVATE_TOKEN`. `GHL_LOCATION_ID` is in Settings, Business Profile, or in the sub-account URL. |

### 4. After the funnel is deployed (Phase 3)

| # | Task | How |
|---|---|---|
| A13 | Cal.com webhook | Cal.com, Settings, Developer, Webhooks, New. Paste the webhook URL I give you (`https://apply.forgeforward.io/api/webhooks/calcom`), triggers BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED, and set a secret: `CALCOM_WEBHOOK_SECRET`. |
| A14 | Cal.com event link | The public URL of your interview event type. Set it in project Settings, General, "Cal.com event link". |
| A15 | Meta webhook for WhatsApp | After deploy, paste `https://apply.forgeforward.io/api/webhooks/whatsapp` and your `WA_VERIFY_TOKEN` into the Meta app webhook settings. |

### 5. Later

| # | Task | How |
|---|---|---|
| A16 | `TEST_EMAIL` and `TEST_PHONE` | Your own email and phone, for "Send test to me". |
| A17 | Run MANUAL_CHECKS.md | Real iPhone Safari, real Android Chrome, Facebook and Instagram in-app browsers. |
| A18 | Official logo files (optional) | Drop them in `public/brand/` if they differ from the logo extracted from the prototype. |
| A19 | Confirm "Applicants this week" definition (optional) | It counts everyone including Did not finish (25). The prototype shows 18. Tell me if it should only count completed applicants. |

---

## B. What I (Claude) will do

Each phase ends with tests, a typecheck, lint, a production build, and updates to PLAN.md and CLAUDE.md.

### Phase 1 finish (needs A1 to A5)
- [x] `TEST_DATABASE_URL` (Neon branch `test`), `ADMIN_KEY` and `CRON_SECRET` generated. Env vars also set on Vercel.
- [x] Migration and seed run on Development (2026-10-21). Production and Preview branches: migrate and seed at deploy.
- [x] Run the 3 skipped integration tests (database write/read, R2 put/HEAD/delete, signed PUT URL) against the test database and `test/` R2 prefix.
- [x] Verify `/api/health` returns ok.
- [x] R2 bucket CORS set by hand in Cloudflare (localhost:3000, forge-hire.vercel.app, apply.forgeforward.io).

### Phase 2 backend: funnel API (needs Phase 1 finish)
- [ ] `POST /api/apply/start`: zod validation, honeypot fake success, rate limit 5 per IP per 10 minutes (Postgres `rate_limit_hits`, test-console bypass header signed with `ADMIN_KEY`), idempotency key, `applied_before` and `previous_applicant_id`, event `form_submitted`, returns `applicant_id` and `resume_token` (the http client expects snake_case).
- [ ] `POST /api/apply/upload-url`: signed PUT URLs for video, thumbnail, task file, checked against `resume_token`.
- [ ] `POST /api/apply/video/complete`: R2 HEAD check and byte count, save video fields, `funnel_step = video_done`, event `video_saved`.
- [ ] `POST /api/apply/task`: submit or skip, set entry stage, `completed_at`, events, idempotency.
- [ ] `POST /api/apply/handoff` (one-time token, 24h expiry, event `handoff_used`) and `POST /api/apply/log` (client events to `system_errors`).
- [ ] Replace the mock project source in the funnel (`getFunnelProject`) with the database; closed and unknown slug behavior stays as built.
- [ ] Switch the funnel to `NEXT_PUBLIC_FUNNEL_API=http`, re-run Playwright against the real routes with the `test/` prefix.
- [ ] Deploy to Vercel (project, env vars, `APP_URL`, domain), send you the funnel link.

### Phase 3 backend: dashboard (admin API and Cal.com)
- [ ] Admin API under `/api/admin/*` behind the cookie gate: projects (create blank/duplicate), stages, questions, applicants (move stage with event, notes, score, mark read, delete with R2 cleanup), settings, templates, unmatched bookings (link, dismiss), signed GET URLs for the player.
- [ ] Replace the in-memory stores (`applicants`, `project-admin`, `project-settings`) with API-backed ones behind the same interfaces so the UI does not change. Keep one source of truth so Settings edits reach the funnel and the board.
- [ ] Add `linkBooking` to `ApplicantActions` so linking an unmatched booking updates the applicant and timeline.
- [ ] Decide task body storage: keep Tiptap HTML or switch to Tiptap JSON in `task_content` (see PLAN.md deviations). I will keep HTML with the sanitizer unless you say otherwise.
- [ ] Slug change must update every store and shared link.
- [ ] `POST /api/webhooks/calcom`: signature check (confirm header name in current Cal.com docs), `processed_webhooks` dedupe, BOOKING_CREATED moves to the `on_booking` stage unless Hired or Rejected, RESCHEDULED, CANCELLED badge, unknown email to `unmatched_bookings`.
- [ ] Playwright specs for the dashboard (drag and reload, stage CRUD with delete target, question archive keeps old labels, Tiptap task shows in funnel, signed and unsigned Cal.com webhook, duplicate webhook acts once, unmatched booking).

### Phase 4: safety nets
- [ ] Vercel Cron in `vercel.json` calling `/api/cron/retention` (03:00 UTC) and `/api/cron/integrity` (05:00 UTC, HEAD every video and thumbnail key), both checking `Authorization: Bearer CRON_SECRET`. Backup 04:00 UTC is `scripts/backup.ts` run by a GitHub Actions schedule (`pg_dump`, gzip, upload to `backups/` in R2, keep 30 days, row in `backups`); it needs `DATABASE_URL` and the R2 keys as repo secrets.
- [ ] GitHub Actions job installs a `postgresql-client` that matches the server's major version. Check the function `maxDuration` for the retention job.
- [ ] `scripts/restore.ts` and a proven restore into a throwaway database with row-count comparison.
- [ ] Red banners driven by `system_errors`, failed backup, or no backup in 26 hours (UI exists, data source is mock).
- [ ] Swap the simulated test console runner for the real HTTP runner (13 checks against the live stack) and the real "Delete test data".
- [ ] Run `pnpm cron:backup` once by hand so the first backup exists.

### Phase 5: messaging
- [ ] Resend email (plain text and simple branded HTML, `EMAIL_FROM`, `EMAIL_REPLY_TO`).
- [ ] WhatsApp Cloud API: approved template sends, delivery status webhook (verify handshake and `X-Hub-Signature-256` with `WA_APP_SECRET`), inbound replies set the unread dot, 24h free-text window.
- [ ] GoHighLevel v2: upsert contact by phone, then send (read the current GHL docs first).
- [ ] Each channel falls back to link mode when its keys are missing.
- [ ] Unit tests with mocked providers: success, provider error, missing keys; missing template variable blocks the send and names it. "Send test to me" for each channel.

### Final
- [ ] Run the test console against production: all 13 green, then delete test data (0 left).
- [ ] Confirm last night's backup exists and the restore test passed.
- [ ] Remove or keep the dev-only route `/dev/video-flow` (it returns 404 in production).
- [ ] Hand you: admin link, funnel link, and MANUAL_CHECKS.md results.

---

## C. Starting a fresh session

Say: "Read CLAUDE.md, PLAN.md and NEXT_STEPS.md, then continue with the next unblocked item in section B." If your keys are in `.env`, start with Phase 1 finish.
