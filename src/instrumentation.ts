import { MIN_ADMIN_KEY_LENGTH } from "@/shared/env";

// Runs once when the server starts. A weak admin key never stops the site, but the admin area stays closed (see proxy.ts)
// and this makes the reason visible in the logs.
export function register() {
  const key = process.env.ADMIN_KEY;
  if (!key || key.length < MIN_ADMIN_KEY_LENGTH) {
    console.error(`[config] ADMIN_KEY is missing or shorter than ${MIN_ADMIN_KEY_LENGTH} characters. The admin area is closed until it is fixed.`);
  }
}
