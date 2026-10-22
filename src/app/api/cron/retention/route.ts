import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectUnlessCron } from "@/platform/cron/auth";
import { continueLater } from "@/platform/cron/continue";
import { runRetention } from "@/features/retention/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const query = z.object({
  after: z.string().uuid().optional(),
  dryRun: z.enum(["1", "true"]).optional(),
});

// Vercel Cron: daily 03:00 UTC (vercel.json). Deletes media older than 30 days outside positive stages.
export async function GET(req: Request) {
  const denied = rejectUnlessCron(req);
  if (denied) return denied;
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Bad query" }, { status: 400 });
  const result = await runRetention({ after: parsed.data.after, dryRun: Boolean(parsed.data.dryRun) });
  if (!result.done && !result.dryRun) continueLater(req, result.nextCursor);
  return NextResponse.json(result);
}
