"use server";

import { headers } from "next/headers";
import { consumeHandoff, enforceRateLimit } from "@/features/applicant-funnel/server";

export type ClaimResult =
  | { ok: true; slug: string; resumeToken: string; applicantId: string; firstName: string; funnelStep: string }
  | { ok: false };

/** Runs from a tap on Continue, never from a page load, so link previews and prefetchers cannot use the link up. */
export async function claimHandoff(token: string): Promise<ClaimResult> {
  try {
    await enforceRateLimit({ headers: await headers() }, "handoff-claim", { max: 20, windowMs: 10 * 60_000 });
  } catch {
    return { ok: false };
  }
  const hand = await consumeHandoff(String(token).slice(0, 200));
  if (!hand) return { ok: false };
  return { ok: true, slug: hand.slug, resumeToken: hand.resumeToken, applicantId: hand.applicantId, firstName: hand.firstName, funnelStep: hand.funnelStep };
}
