import { spawn } from "node:child_process";
import { createGunzip, createGzip, gunzipSync } from "node:zlib";
import { Readable } from "node:stream";

/** Connection settings as PG* env vars, so the password never shows up in a process list. */
export function pgEnv(url: string): NodeJS.ProcessEnv {
  const u = new URL(url);
  return {
    ...process.env,
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: decodeURIComponent(u.pathname.slice(1)),
    PGSSLMODE: u.searchParams.get("sslmode") ?? "require",
  };
}

export function withDatabase(url: string, database: string): string {
  const u = new URL(url);
  u.pathname = `/${database}`;
  return u.toString();
}

/** Same host and database. Used to refuse a restore into the live database. */
export function sameDatabase(a: string, b: string): boolean {
  const x = new URL(a);
  const y = new URL(b);
  const host = (h: string) => h.replace("-pooler", "");
  return host(x.hostname) === host(y.hostname) && x.pathname === y.pathname;
}

function bin(name: string) {
  const dir = process.env.PG_BIN_DIR;
  return dir ? `${dir.replace(/\/$/, "")}/${name}` : name;
}

function collect(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c) => chunks.push(Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

/** pg_dump as plain SQL, gzipped. Throws with pg_dump's own message (no secrets) on failure. */
export async function dumpGzipped(url: string): Promise<Buffer> {
  const child = spawn(bin("pg_dump"), ["--no-owner", "--no-privileges", "--format=plain"], {
    env: pgEnv(url),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  const gz = child.stdout.pipe(createGzip({ level: 9 }));
  const done = new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`pg_dump exited ${code}: ${stderr.trim().slice(0, 400)}`))));
  });
  const [out] = await Promise.all([collect(gz), done]);
  return out;
}

/** A plain pg_dump ends with this comment (newer versions add a trailing \unrestrict line). Missing means cut short. */
export function looksComplete(gzipped: Buffer): boolean {
  const text = gunzipSync(gzipped).toString("utf8");
  return text.slice(-400).includes("PostgreSQL database dump complete");
}

/** Feeds a gzipped plain dump to psql inside one transaction. */
export async function restoreGzipped(url: string, gzipped: Buffer): Promise<void> {
  const child = spawn(bin("psql"), ["-v", "ON_ERROR_STOP=1", "--single-transaction", "--quiet", "-o", "/dev/null"], {
    env: pgEnv(url),
    stdio: ["pipe", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  const done = new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`psql exited ${code}: ${stderr.trim().slice(0, 600)}`))));
  });
  Readable.from(gzipped).pipe(createGunzip()).pipe(child.stdin);
  await done;
}
