"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { FunnelShell } from "@/components/funnel";
import { loadFlow } from "../state/persistence";
import type { FunnelProject } from "../types";
import { FunnelSkeleton } from "./funnel-skeleton";
import { MetaPixel } from "./meta-pixel";
import { ThankYou } from "./thank-you";

/**
 * /a/[slug]/thanks. Only people who finished (form, video, task) see it, and only then does the pixel load.
 * Anyone else is sent back to the funnel, so a direct visit never counts.
 */
const subscribe = () => () => {};

export function ThankYouPage({ project }: { project: FunnelProject }) {
  const router = useRouter();
  // Strings keep the snapshot stable: "pending" on the server, "none" when unfinished, "done:<first name>" when finished.
  const flow = useSyncExternalStore(
    subscribe,
    () => {
      const saved = loadFlow(project.slug);
      return saved?.step === "done" && saved.session ? `done:${saved.firstName}` : "none";
    },
    () => "pending",
  );

  useEffect(() => {
    if (flow === "none") router.replace(`/a/${project.slug}`);
  }, [flow, project.slug, router]);

  return (
    <FunnelShell step={4}>
      {!flow.startsWith("done:") ? (
        <FunnelSkeleton />
      ) : (
        <>
          <ThankYou text={project.thankYouText} firstName={flow.slice(5)} replyDays={project.replyDays} />
          <MetaPixel />
        </>
      )}
    </FunnelShell>
  );
}
