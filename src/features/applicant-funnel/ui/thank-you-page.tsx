"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { FunnelShell } from "@/components/funnel";
import { isShadowToken } from "../lib/shadow-token";
import { loadFlow } from "../state/persistence";
import type { FunnelProject } from "../types";
import { FunnelSkeleton } from "./funnel-skeleton";
import { MetaPixel } from "./meta-pixel";
import { ThankYou } from "./thank-you";

/**
 * /a/[slug]/thanks. Only people who finished (form, video, task) see it, and only then does the pixel load.
 * Anyone else is sent back to the funnel, so a direct visit never counts. A repeat applicant (their phone number already
 * finished this project) sees the same page but the pixel stays off, so they are not counted as a new application.
 */
const subscribe = () => () => {};

export function ThankYouPage({ project }: { project: FunnelProject }) {
  const router = useRouter();
  // Strings keep the snapshot stable: "pending" on the server, "none" when unfinished,
  // "done:<1 if counted>:<first name>" when finished. A repeat applicant (shadow session) is not counted: no pixel.
  const flow = useSyncExternalStore(
    subscribe,
    () => {
      const saved = loadFlow(project.slug);
      return saved?.step === "done" && saved.session ? `done:${isShadowToken(saved.session.resumeToken) ? 0 : 1}:${saved.firstName}` : "none";
    },
    () => "pending",
  );

  useEffect(() => {
    if (flow === "none") router.replace(`/a/${project.slug}`);
  }, [flow, project.slug, router]);

  return (
    <FunnelShell step={4} hasTask={project.taskEnabled}>
      {!flow.startsWith("done:") ? (
        <FunnelSkeleton />
      ) : (
        <>
          <ThankYou text={project.thankYouText} firstName={flow.slice("done:0:".length)} replyDays={project.replyDays} />
          {flow.startsWith("done:1:") && <MetaPixel />}
        </>
      )}
    </FunnelShell>
  );
}
