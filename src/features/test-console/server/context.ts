import { ADMIN_COOKIE, cookieValue } from "@/features/admin-access";
import { signTestConsole, TEST_CONSOLE_HEADER } from "@/features/applicant-funnel/server";

export const PROJECT_SLUG = process.env.TEST_PROJECT_SLUG || "appointment-setter";

export type Ctx = { origin: string };

export class CheckFailure extends Error {}

export function adminKey(): string {
  const k = process.env.ADMIN_KEY;
  if (!k) throw new CheckFailure("ADMIN_KEY is not set.");
  return k;
}

/** Calls this same deployment over HTTP, the way a browser or Cal.com would. */
export async function call(
  ctx: Ctx,
  path: string,
  init: { method?: string; json?: unknown; body?: BodyInit; headers?: Record<string, string>; admin?: boolean; consoleBypass?: boolean } = {},
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  if (init.json !== undefined) headers["content-type"] = "application/json";
  if (init.admin) headers.cookie = `${ADMIN_COOKIE}=${cookieValue(adminKey())}`;
  if (init.consoleBypass) headers[TEST_CONSOLE_HEADER] = signTestConsole(adminKey());
  const res = await fetch(new URL(path, ctx.origin), {
    method: init.method ?? "POST",
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    cache: "no-store",
    redirect: "manual",
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: res.status, body };
}

/** Short error text from an API answer. Never includes secrets. */
export function errorText(r: { status: number; body: unknown }): string {
  const b = r.body as { error?: unknown; message?: unknown } | null;
  const msg = typeof b?.message === "string" ? b.message : typeof b?.error === "string" ? b.error : "";
  return `HTTP ${r.status}${msg ? `: ${msg.slice(0, 160)}` : ""}`;
}

export function need(state: Record<string, string | number>, key: string): string {
  const v = state[key];
  if (v === undefined || v === "") throw new CheckFailure(`Needs an earlier check (${key}). Run the full test in order.`);
  return String(v);
}
