import { after } from "next/server";

/** The URL the next batch call uses. */
export function continuationUrl(req: Request, cursor: string, appUrl: string | undefined): URL {
  const incoming = new URL(req.url);
  // Send the secret to our own origin (APP_URL), never to whatever Host the caller supplied.
  const url = appUrl ? new URL(incoming.pathname + incoming.search, appUrl) : incoming;
  url.searchParams.set("after", cursor);
  return url;
}

/**
 * When a batch job ran out of time, call the same route again with the cursor so the work resumes
 * in a fresh invocation. The chain stops when the job reports done.
 */
export function continueLater(req: Request, cursor: string | undefined) {
  if (!cursor) return;
  const url = continuationUrl(req, cursor, process.env.APP_URL || undefined);
  const authorization = req.headers.get("authorization");
  if (!authorization) return;
  after(async () => {
    try {
      await fetch(url, { headers: { authorization }, cache: "no-store" });
    } catch {
      /* the next scheduled run continues from the start of the remaining work */
    }
  });
}
