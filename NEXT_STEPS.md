# NEXT STEPS

Last updated: 2026-10-21. This is the single list of what is left. Read it together with CLAUDE.md (how the repo works) and PLAN.md (progress and deviations).

State in one line: front-end and backend are built, pushed and deployed (Neon, R2, Vercel linked). The first deploy is live at https://forge-hire.vercel.app. Left: a separate production database, the live test console run, GitHub backup secrets, and the Resend, WhatsApp, GHL and Cal.com keys.

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
| A13 SKIPPED | Cal.com webhook (decision: not used) | Cal.com, Settings, Developer, Webhooks, New. Paste the webhook URL I give you (`https://apply.forgeforward.io/api/webhooks/calcom`), triggers BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED, and set a secret: `CALCOM_WEBHOOK_SECRET`. |
| A14 | Cal.com event link | The public URL of your interview event type. Set it in project Settings, General, "Cal.com event link". |
| A15 | Meta webhook for WhatsApp | After deploy, paste `https://apply.forgeforward.io/api/webhooks/whatsapp` and your `WA_VERIFY_TOKEN` into the Meta app webhook settings. |

### 4b. Deploy-time (GitHub and Vercel)

| # | Task | How |
|---|---|---|
| A20 DONE | Vercel env vars | Set. Change `APP_URL` on Production to `https://apply.forgeforward.io` when the domain is live (A7). |
| A21 DONE | Production Neon branch URL | Neon, branch for production, Connect, pooled URL. In Vercel, project Settings, Environment Variables, edit `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for Production only. Today all three environments share the Development URL. |
| A22 | GitHub repo secrets for the nightly backup | GitHub repo, Settings, Secrets and variables, Actions: `DATABASE_URL_UNPOOLED` (Production), `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. |
| A23 | Add the Vercel URL to R2 CORS | Cloudflare, R2, `forge-hire`, Settings, CORS Policy (already lists localhost:3000, forge-hire.vercel.app, apply.forgeforward.io). |

### 5. Later

| # | Task | How |
|---|---|---|
| A16 | `TEST_EMAIL` and `TEST_PHONE` | Your own email and phone, for "Send test to me". |
| A17 | Run MANUAL_CHECKS.md | Real iPhone Safari, real Android Chrome, Facebook and Instagram in-app browsers. |
| A18 | Official logo files (optional) | Drop them in `public/brand/` if they differ from the logo extracted from the prototype. |
| A19 | Confirm "Applicants this week" definition (optional) | It counts everyone including Did not finish (25). The prototype shows 18. Tell me if it should only count completed applicants. |

---

## B. Backend status and what is left for Claude

Built, tested and committed (2026-10-21): Phase 1, Phase 2 funnel API, Phase 3 admin API and Cal.com webhook, Phase 4 cron/backup/restore/test console, Phase 5 provider code (mocked). Checks: typecheck, lint, 403 vitest tests and the production build are clean. Funnel Playwright 24/24 against the real routes.

### Open for Claude
- [x] Dashboard on the database: loading skeleton, DB stage ids, unmatched bookings and `linkBooking` wired, messages saved in link mode, `outputFileTracingIncludes` for the sample video, task body bug fixed. 9 dashboard Playwright specs green.
- [x] Vercel env (all environments) set. First deploy to https://forge-hire.vercel.app is live and healthy (health ok, funnel loads the real project, admin 404 without cookie, cron 401 without token).
- [ ] Run the live test console once: open `https://forge-hire.vercel.app/admin/k/<ADMIN_KEY>`, go to `/admin/test`, expect 13 green, then "Delete test data" shows 0 left. Checks 8 and 9 (Cal.com webhook) show as skipped: decision 2026-10-22, the Cal.com webhook is not used, so no `CALCOM_WEBHOOK_SECRET`. Bookings do not move cards automatically.
- [x] Production has its own Neon branch `production` (schema-only copy, migrations 0000 and 0001 recorded, seeded, Cal link set to https://cal.com/matisseforgeforward/interview-appointment-setter). Vercel Production `DATABASE_URL` and `DATABASE_URL_UNPOOLED` point at it; Preview and Development still use the Development branch.
- [x] `applicants.task_file_name` and `task_file_bytes` added (migration `0001_minor_black_panther`, applied to test, Development and Production). Optional `unmatched_bookings.linked_applicant_id`, `dismissed_at` stay inside the payload JSON for now.
- [ ] Hired and Rejected are matched by stage NAME (no role column). Keep those names for terminal stages or add roles.
- [x] Template validation: the server now rejects unknown `{variables}` with a 400 (`unknown_variables`). Not committed yet.
- [ ] Run `pnpm cron:backup` once by hand so the first backup exists (needs `postgresql@18` pg_dump, installed locally).
- [ ] Final: run the test console on production (13 green, then 0 test rows left), confirm last night's backup and the restore proof, decide on the dev-only route `/dev/video-flow` (404 in production).

### Done (for reference)
- [x] Phase 1: Neon Development migrated and seeded, `test` branch, R2 bucket and CORS, 3 integration tests, `/api/health`.
- [x] Phase 2: `/api/apply/start|upload-url|video/complete|task|handoff|log`, Postgres rate limit (5 per IP per 10 min, `FUNNEL_RATE_LIMIT_MAX`), idempotency, `/a/[slug]` reads the project from the DB, handoff landing page. If a project has no task, saving the video completes the application.
- [x] Phase 3: `/api/admin/{projects,settings,stages,questions,templates,applicants,unmatched-bookings}`, DB-backed stores behind the same interfaces (switch `NEXT_PUBLIC_ADMIN_API=http`), `/api/webhooks/calcom` (`x-cal-signature-256` HMAC, dedupe, unmatched bookings). Task body is stored as `{html}` in `task_content`, sanitized on write and read.
- [x] Phase 4: `/api/cron/retention` and `/api/cron/integrity` (bearer `CRON_SECRET`, vercel.json crons), `scripts/backup.ts`, `scripts/restore.ts` (restore proven into a throwaway database), `.github/workflows/backup.yml`, banners from `/api/admin/system-alerts`, real 13-check test console under `/api/admin/test/*` (`NEXT_PUBLIC_TEST_CONSOLE=mock` keeps the simulation).
- [x] Phase 5 code: Resend, WhatsApp Cloud API (+ webhook `/api/webhooks/whatsapp`), GoHighLevel v3 `Version` header (`GHL_API_VERSION`), `/api/admin/messages/send`, link-mode fallback, "Send test to me". Only mocked providers were tested. Set `NEXT_PUBLIC_SEND_MODE=api` once keys exist.

## C. Starting a fresh session

Say: "Read CLAUDE.md, PLAN.md and NEXT_STEPS.md, then continue with the next unblocked item in section B." If your keys are in `.env`, start with Phase 1 finish.
