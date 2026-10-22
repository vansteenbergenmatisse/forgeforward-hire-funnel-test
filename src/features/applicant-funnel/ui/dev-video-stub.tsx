"use client";

import { useState } from "react";
import { MainButton, StepBody, StepFooter } from "@/components/funnel";
import type { VideoFlowProps } from "../types";

/** Smallest valid-looking upload for the real API: a few bytes under the applicant's own R2 folder. */
async function saveTinyVideo({ api, session }: Pick<VideoFlowProps, "api" | "session">) {
  const mime = "video/webm";
  const blob = new Blob([new Uint8Array(64)], { type: mime });
  const urls = await api.getUploadUrls({ resumeToken: session.resumeToken, kind: "video", mime, filename: "stub.webm", withThumb: false, bytes: blob.size });
  const res = await fetch(urls.putUrl, { method: "PUT", body: blob, headers: { "Content-Type": mime } });
  if (!res.ok) throw new Error("stub upload failed");
  await api.completeVideo({ resumeToken: session.resumeToken, key: urls.key, mime, bytes: blob.size, seconds: 10, audioOnly: true, retakeUsed: false });
}

/** Stand-in for the real VideoFlow while it is not available. Never shown in production builds. */
export function DevVideoStub({ onUploaded, api, session }: VideoFlowProps) {
  const [busy, setBusy] = useState(false);
  async function pretend() {
    setBusy(true);
    try {
      // With the real API the stub still saves a tiny object so later steps work.
      if (process.env.NEXT_PUBLIC_FUNNEL_API === "http") await saveTinyVideo({ api, session });
      onUploaded();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <StepBody>
        <p className="text-base text-muted">Dev stub for the video step.</p>
      </StepBody>
      <StepFooter>
        <MainButton onClick={pretend} disabled={busy}>Pretend the video uploaded</MainButton>
      </StepFooter>
    </>
  );
}
