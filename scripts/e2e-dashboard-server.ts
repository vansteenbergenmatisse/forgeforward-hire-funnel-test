// Starts a dev server for the dashboard specs: test database, test/ R2 prefix, http API mode,
// a throwaway admin key and Cal.com secret, and every outbound provider switched off.
// Usage: pnpm exec tsx scripts/e2e-dashboard-server.ts   (port 3210, dist dir .next-int)
import { spawn } from "node:child_process";
import { config } from "dotenv";

config({ path: [".env.local", ".env.development.local", ".env"], quiet: true });

const testDb = process.env.TEST_DATABASE_URL;
if (!testDb) {
  console.error("TEST_DATABASE_URL is missing. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const port = process.env.E2E_PORT ?? "3210";
const off = ["RESEND_API_KEY", "WA_PHONE_NUMBER_ID", "WA_ACCESS_TOKEN", "WA_APP_SECRET", "GHL_PRIVATE_TOKEN", "GHL_LOCATION_ID"];
for (const k of off) delete process.env[k];

const env = {
  ...process.env,
  DATABASE_URL: testDb,
  R2_KEY_PREFIX: "test/",
  ADMIN_KEY: process.env.E2E_ADMIN_KEY ?? "e2e-admin-key-".padEnd(48, "x"),
  CALCOM_WEBHOOK_SECRET: process.env.E2E_CALCOM_SECRET ?? "e2e-calcom-test-secret",
  NEXT_PUBLIC_ADMIN_API: "http",
  NEXT_PUBLIC_FUNNEL_API: "http",
  NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-int",
  APP_URL: `http://localhost:${port}`,
};

const child = spawn("pnpm", ["exec", "next", "dev", "-p", port], { env, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => child.kill(sig));
