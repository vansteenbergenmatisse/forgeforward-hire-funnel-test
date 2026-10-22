import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "./errors";

const MAX_BODY_BYTES = 64 * 1024;

/** Reads a small JSON body. Throws ApiError 400/413 on bad input. */
export async function readJson(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new ApiError(413, "too_large");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError(413, "too_large");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(400, "bad_json");
  }
}

export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.output<S> {
  const r = schema.safeParse(body);
  if (r.success) return r.data;
  const fields: Record<string, string> = {};
  for (const issue of r.error.issues) fields[issue.path.join(".") || "_"] ??= issue.message;
  throw new ApiError(400, "invalid", "Invalid input", fields);
}

export function idempotencyKey(req: Request): string {
  const key = req.headers.get("idempotency-key")?.trim() ?? "";
  if (key.length < 8 || key.length > 100) throw new ApiError(400, "idempotency_key_required");
  return key;
}

/** Route wrapper: logs nothing sensitive, never leaks internals. */
export async function handle(run: () => Promise<Response | object | null>): Promise<Response> {
  try {
    const out = await run();
    if (out === null) return new NextResponse(null, { status: 204 });
    return out instanceof Response ? out : NextResponse.json(out);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.code, message: err.message, fields: err.fields }, { status: err.status });
    }
    console.error("funnel api error", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
