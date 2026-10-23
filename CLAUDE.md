# Forge Hire

Hiring funnel (/a/[slug]) and private applicant dashboard (/adminMatt) for Forge Forward. First project: Appointment Setter. Spec: FUNNEL_SPEC.md (source of truth). Plan and progress: PLAN.md. Device checks a bot cannot do: MANUAL_CHECKS.md. What the user must do and what is left for Claude: NEXT_STEPS.md (read it first in a new session).

## Status (2026-10-21)
- Done: front-end (funnel A01 to A16, dashboard D01 to D15), and the backend: funnel API, admin API, Cal.com webhook, cron/backup/restore, test console runner, messaging provider code. Neon, R2 and Vercel are set up.
- Switches: `NEXT_PUBLIC_FUNNEL_API=http` and `NEXT_PUBLIC_ADMIN_API=http` use the real routes (default is mock). `NEXT_PUBLIC_TEST_CONSOLE=mock` keeps the simulated console. `NEXT_PUBLIC_SEND_MODE=api` once messaging keys exist.
- Deployed: https://apply.forgeforward.io (also forge-hire.vercel.app) (Vercel auto-deploys on push to main; Production env has both http switches). Dashboard and funnel run on the database. Production uses its own Neon branch `production`, set through `APP_DATABASE_URL` on Vercel (the app prefers it over `DATABASE_URL`, which the Neon integration overwrites on deploy); Development and Preview use the Development branch.
- Not done: provider keys (Resend, WhatsApp, GHL, Cal.com secret). See NEXT_STEPS.md.
- Details, deviations and what is mock: PLAN.md.

## Stack (decided)
- Next.js 16 App Router + strict TypeScript, pnpm, ESLint, Tailwind v4. Read `AGENTS.md` and `node_modules/next/dist/docs/` before using Next APIs (`middleware` is now `proxy`, page props are `PageProps<"/x/[slug]">`, params are Promises).
- Postgres + Drizzle. Cloudflare R2 for video. Resend (email), WhatsApp Cloud API, GoHighLevel v2 (SMS), Cal.com webhooks. Vercel for web and cron (Vercel Cron calls `/api/cron/*` with `CRON_SECRET`). Postgres on Neon via the Vercel Marketplace (pooled `DATABASE_URL`). Nightly `pg_dump` backup runs in a GitHub Actions schedule because a Vercel function has no `pg_dump`.
- `cacheComponents` is OFF on purpose (conflicts with `force-dynamic` on /api/health).

## Layout
`src/{app,features,components,platform,shared}`. Features expose one `index.ts`; import only through it.
- `features/applicant-funnel`: funnel UI, state, `FunnelApi` (mock + http), video flow in `video/`.
- `features/applicants`: applicant view model, mock data, in-memory store, pure rules (retention, filters, CSV, local time).
- `features/pipeline`: board, Did not finish, Table. `features/applicant-review`: drawer + player. `features/messaging`: template fill + send modal.
- `features/project-admin`: Projects home, projects store. `features/project-settings`: 7 settings tabs. `features/test-console`: simulated test console.
- `features/projects`: types, defaults, fixtures. Its `index` is client-safe; server-only code is in `projects/server.ts`.
- `features/project-lifecycle`: deactivate, reactivate and delete a project (card menu, Settings > General, danger zone). `index` is client-safe; server code is in `project-lifecycle/server.ts`.
- `features/admin-access`: admin cookie gate, password login (`/adminMatt/login`, 8 wrong tries per IP per 15 min in Postgres), key link fallback. `features/bookings`: Cal.com link builder.
- `components/{brand,ui,forms,layout,funnel}`: shared UI. `platform/{db,r2}`: server only, never import from client components.

## Commands
- `pnpm dev` (set `ADMIN_KEY` to a 48+ char string; open `/adminMatt` and sign in with `ADMIN_PASSWORD`; the fallback `/adminMatt/k/<key>` also sets the admin cookie).
- `pnpm exec tsc --noEmit --incremental false`, `pnpm lint`, `pnpm test` (vitest), `pnpm build`.
- Playwright: start a dev server, then `pnpm exec playwright test` (funnel, baseURL `E2E_BASE_URL` or http://localhost:3101) and `pnpm exec playwright test -c playwright.video.config.ts` (video flow, http://localhost:3104). Chromium runs with fake camera and mic flags.
- Dashboard Playwright: `pnpm exec tsx scripts/e2e-dashboard-server.ts` (test DB, `test/` prefix, providers off), then `pnpm exec playwright test -c playwright.dashboard.config.ts`. `pnpm exec playwright test` skips the dashboard and video specs.
- Device end-to-end on production: `pnpm test:e2e:devices` (`playwright.devices.e2e.config.ts`, `e2e/devices-e2e/`). Real funnel to DB, R2 and dashboard per device. Needs `ADMIN_KEY` and `ADMIN_PASSWORD` (env or `.env.local`), optional `DATABASE_URL_UNPOOLED`/`E2E_DB_ENV_FILE`. Writes only `is_test` data (signed test-console header on same-origin `/api/apply/**`) and its teardown deletes it all. Board check uses `/adminMatt/p/<slug>?test=1` (admin only; `E2E_SKIP_BOARD=1` until deployed). Real OS coverage: the manual GitHub Action `devices-e2e.yml`. Untestable: real phone cameras, Facebook/Instagram apps.
- Backups: `pnpm cron:backup` (needs `pg_dump` 18: `brew install postgresql@18`), `scripts/restore.ts --prove`. Crons: `vercel.json` calls `/api/cron/*` with `CRON_SECRET`.
- Parallel dev servers need separate build dirs: `NEXT_DIST_DIR=.next-x pnpm exec next dev -p <port>`. Run `pnpm exec next typegen` if route types look stale.
- Device matrix (read-only, live site by default): `pnpm test:devices` / `pnpm test:devices:local`; details in MANUAL_CHECKS.md.
- DB: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`.

## Front-end switches (dev)
- Funnel: `?step=A01..A16` review screens (non-production), `?sim=server-error|slow|fail-upload`, `?video=stub`. `NEXT_PUBLIC_FUNNEL_API=http` uses the real routes.
- Dashboard: `?tab=board|dnf|table`, `?a=<applicantId>` opens the drawer, `&play=1` starts playback, `&send=whatsapp|sms|email` opens the send panel. Settings: `?tab=general|questions|video|task|stages|messages|thankyou`.
- Reset mock data: clear `forge-hire*` keys in localStorage.
- `design-reference/` (gitignored) holds the prototype and per-screen digests.

## Rules
- Copy: short sentences, plain words, no em dashes.
- Brand: Signal Red #D93A31, Red Deep #B8302A, Red Tint #FCEFED, Deep Charcoal #0E1220, Warm Ivory #FCFBF8. Barlow Condensed headings, Inter body (next/font). Tap targets 48 px min. Tokens live in `src/app/globals.css`; no hex values or inline styles in components.
- Icons: lucide-react only. No emoji. Country is a 2-letter chip, never a flag emoji.
- Tests use the Neon `test` branch (`TEST_DATABASE_URL`) and the `test/` R2 prefix, never production data.
- All times UTC in the database. Every table has uuid id, created_at, updated_at.
- Stop only for missing env keys; name the key and where to get it.
- Git identity for this repo: vansteenbergenmatisse / vansteenbergenmatisse@gmail.com. Remote: github.com/vansteenbergenmatisse/forgeforward-hire-funnel-test.
