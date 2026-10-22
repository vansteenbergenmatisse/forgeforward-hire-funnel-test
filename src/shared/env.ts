import { z } from "zod";

export const MIN_ADMIN_KEY_LENGTH = 32;

const schema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  ADMIN_KEY: z.string().min(MIN_ADMIN_KEY_LENGTH),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_KEY_PREFIX: z.string().default(""),
});

const r2Schema = schema.pick({
  R2_ACCOUNT_ID: true,
  R2_ACCESS_KEY_ID: true,
  R2_SECRET_ACCESS_KEY: true,
  R2_BUCKET: true,
  R2_KEY_PREFIX: true,
});

export type Env = z.infer<typeof schema>;
export type R2Env = z.infer<typeof r2Schema>;

let cached: Env | undefined;

export function env(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}

let cachedR2: R2Env | undefined;

/** Only the storage settings. Scripts that talk to R2 (the backup job) have no admin key and must not need one. */
export function r2Env(): R2Env {
  cachedR2 ??= r2Schema.parse(process.env);
  return cachedR2;
}

export function optionalEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}
