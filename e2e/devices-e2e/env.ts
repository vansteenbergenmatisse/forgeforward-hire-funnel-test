import { existsSync, readFileSync } from "node:fs";

/** Reads one KEY=value line from a dotenv-style file without parsing the rest (some files have unparsable lines). */
function fromFile(file: string, key: string): string | undefined {
  if (!existsSync(file)) return undefined;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.startsWith(`${key}=`)) continue;
    const v = line.slice(key.length + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    if (v) return v;
  }
  return undefined;
}

/** Process env first, then .env.local, then .env. Never printed. */
export function secret(key: "ADMIN_KEY" | "ADMIN_PASSWORD"): string {
  const v = process.env[key] || fromFile(".env.local", key) || fromFile(".env", key);
  if (!v) throw new Error(`${key} is not set. Put it in the environment or .env.local.`);
  return v;
}

/**
 * Unpooled URL of the database behind the target site, for the optional row check.
 * Never falls back to .env: that file points at a different (development) database.
 * Local runs point E2E_DB_ENV_FILE at a file holding DATABASE_URL_UNPOOLED.
 */
export function dbUrl(): string | undefined {
  if (process.env.DATABASE_URL_UNPOOLED) return process.env.DATABASE_URL_UNPOOLED;
  const file = process.env.E2E_DB_ENV_FILE;
  return file ? fromFile(file, "DATABASE_URL_UNPOOLED") : undefined;
}

export const BASE_URL = (process.env.E2E_BASE_URL || "https://apply.forgeforward.io").replace(/\/$/, "");
export const PROJECT_SLUG = process.env.E2E_PROJECT_SLUG || "appointment-setter";
