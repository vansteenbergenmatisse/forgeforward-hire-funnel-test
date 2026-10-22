export type DatabaseUrlChoice = { url: string; source: "APP_DATABASE_URL" | "DATABASE_URL" };

/** APP_DATABASE_URL wins: the Neon integration rewrites DATABASE_URL on every Vercel production deploy. */
export function chooseDatabaseUrl(vars: Record<string, string | undefined>): DatabaseUrlChoice | null {
  if (vars.APP_DATABASE_URL) return { url: vars.APP_DATABASE_URL, source: "APP_DATABASE_URL" };
  if (vars.DATABASE_URL) return { url: vars.DATABASE_URL, source: "DATABASE_URL" };
  return null;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** TLS is required for every host except a local one, even if the URL has no sslmode. */
export function needsTls(url: string): boolean {
  try {
    const u = new URL(url);
    if (LOCAL_HOSTS.has(u.hostname)) return false;
    return u.searchParams.get("sslmode") !== "disable";
  } catch {
    return true;
  }
}

/** Host only, for logs. Never includes the user, password or database name. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unparseable";
  }
}
