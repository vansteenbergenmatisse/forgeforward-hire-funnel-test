"use client";

import { useEffect } from "react";
import { saveFlow, stepForServerProgress } from "../state/persistence";

/**
 * Drops the applicant into their place in this browser with their saved form, then opens the funnel.
 * `funnelStep` is where the server says they stand (form_done, video_done, completed). Without it, the video step.
 * The funnel turns a task step into the thank you page when the project has no task.
 */
export function HandoffLanding({
  slug,
  resumeToken,
  applicantId,
  firstName,
  funnelStep,
}: {
  slug: string;
  resumeToken: string;
  applicantId: string;
  firstName: string;
  funnelStep?: string;
}) {
  useEffect(() => {
    saveFlow(slug, { step: stepForServerProgress(funnelStep, true), session: { applicantId, resumeToken }, firstName, inAppBrowser: false });
    window.location.replace(`/a/${encodeURIComponent(slug)}`);
  }, [slug, resumeToken, applicantId, firstName, funnelStep]);
  return <p className="px-5 py-8 text-muted">Opening your application</p>;
}
