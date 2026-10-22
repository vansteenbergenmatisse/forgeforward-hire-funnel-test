import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { ApiError } from "./errors";

const MAX_BODY_BYTES = 1_000_000;

/** Reads a JSON body with a size cap and validates it. Requires application/json so plain form posts are refused. */
export async function readBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Send application/json.");
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) throw new ApiError(413, "too_large", "The request body is too large.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "invalid_json", "The body is not valid JSON.");
  }
  return schema.parse(json);
}

/** Runs a handler and turns thrown errors into JSON responses. Never logs request data. */
export async function respond(fn: () => Promise<unknown>, status = 200): Promise<NextResponse> {
  try {
    const body = await fn();
    return NextResponse.json(body ?? { ok: true }, { status, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status, headers: { "Cache-Control": "no-store" } });
    }
    if (e instanceof ZodError) {
      const issues = e.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
      return NextResponse.json({ error: "invalid", message: "Some fields are not valid.", issues }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    console.error("admin api error", e instanceof Error ? e.name : "unknown");
    return NextResponse.json({ error: "server_error", message: "Something went wrong." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
