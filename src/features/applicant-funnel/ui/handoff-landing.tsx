"use client";

import { useEffect } from "react";
import { saveFlow } from "../state/persistence";

/** Drops the applicant into the video step in this browser with their saved form, then opens the funnel. */
export function HandoffLanding({ slug, resumeToken, applicantId, firstName }: { slug: string; resumeToken: string; applicantId: string; firstName: string }) {
  useEffect(() => {
    saveFlow(slug, { step: "video", session: { applicantId, resumeToken }, firstName, inAppBrowser: false });
    window.location.replace(`/a/${encodeURIComponent(slug)}`);
  }, [slug, resumeToken, applicantId, firstName]);
  return <p className="px-5 py-8 text-muted">Opening your application</p>;
}
