# Forge Hire

Hiring funnel (/a/[slug]) and private applicant dashboard (/admin) for Forge Forward. First project: Appointment Setter. Spec: FUNNEL_SPEC.md (source of truth). Plan: PLAN.md.

## Stack (decided)
- Next.js App Router + strict TypeScript, pnpm, ESLint, Tailwind. Deployed on Railway (web, Postgres, cron).
- Postgres + Drizzle. Cloudflare R2 for video. Resend (email), WhatsApp Cloud API, GoHighLevel v2 (SMS), Cal.com webhooks.
- Layout: `src/{app,features,components,platform,shared}`. Features expose one `index` entrypoint.

## Rules
- Do not write app code until the user replies "go" after PLAN.md.
- Copy: short sentences, plain words, no em dashes.
- Brand: Signal Red #D93A31, Deep Charcoal #0E1220, Warm Ivory #E7E3DC. Barlow Condensed headings, Inter body (next/font). Tap targets 48 px min.
- Design reference: ~/Downloads/forge-hire-page-7.html. Rebuild as clean components, never copy inline styles.
- Tests use a separate test database and the `test/` R2 prefix, never production data.
- All times UTC in the database. Every table has uuid id, created_at, updated_at.
- Stop only for missing env keys; name the key and where to get it.
