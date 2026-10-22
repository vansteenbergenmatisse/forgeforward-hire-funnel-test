import { after } from "next/server";

/**
 * When a batch job ran out of time, call the same route again with the cursor so the work resumes
 * in a fresh invocation. The chain stops when the job reports done.
 */
export function continueLater(req: Request, cursor: string | undefined) {
  if (!cursor) return;
  const url = new URL(req.url);
  url.searchParams.set("after", cursor);
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
