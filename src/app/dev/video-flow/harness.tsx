"use client";

import { useMemo, useState } from "react";
import { Logo } from "@/components/brand";
import { MOCK_PROJECT } from "@/features/projects";
import { VideoFlow } from "@/features/applicant-funnel/video";
import type { FunnelApi, VideoFlowProps } from "@/features/applicant-funnel";

type Props = {
  debugState?: string;
  inApp: boolean;
  resume: boolean;
  prep?: number;
  max?: number;
  retakes?: number;
};

declare global {
  interface Window {
    __videoCalls?: { getUploadUrls: number; completeVideo: number; createHandoff: number };
  }
}

const calls = { getUploadUrls: 0, completeVideo: 0, createHandoff: 0 };

function makeApi(): FunnelApi {
  if (typeof window !== "undefined") window.__videoCalls = calls;
  const nope = async () => {
    throw new Error("not used in this harness");
  };
  return {
    start: nope,
    submitTask: nope,
    log: async () => {},
    async getUploadUrls() {
      calls.getUploadUrls++;
      return { key: "videos/dev/demo.webm", putUrl: "mock://video", thumbKey: "thumbs/dev/demo.jpg", thumbPutUrl: "mock://thumb" };
    },
    async completeVideo() {
      calls.completeVideo++;
    },
    async createHandoff() {
      calls.createHandoff++;
      return { url: "https://forgeforward.io/a/appointment-setter?h=7Kq2dev", expiresAt: new Date(Date.now() + 864e5).toISOString() };
    },
  };
}

/** Minimal stand-in for the funnel shell: logo, then the video flow, then a "done" marker. */
export function Harness({ debugState, inApp, resume, prep, max, retakes }: Props) {
  const [done, setDone] = useState(false);
  const api = useMemo(() => makeApi(), []);
  const project = useMemo(
    () => ({
      ...MOCK_PROJECT,
      questions: [],
      prepSeconds: prep ?? MOCK_PROJECT.prepSeconds,
      maxRecordSeconds: max ?? MOCK_PROJECT.maxRecordSeconds,
      retakesAllowed: retakes ?? MOCK_PROJECT.retakesAllowed,
    }),
    [prep, max, retakes],
  );
  const props: VideoFlowProps = {
    project,
    session: { applicantId: "dev", resumeToken: "dev-token" },
    api,
    inAppBrowser: inApp,
    resumeUpload: resume,
    onUploaded: () => setDone(true),
    debugState: debugState as VideoFlowProps["debugState"],
  };
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-ivory">
      <header className="flex flex-none justify-center border-b border-line bg-white px-5 py-3.5 md:px-10 md:py-[22px]">
        <Logo />
      </header>
      {done ? <p data-testid="uploaded" className="p-8 text-center font-bold">Uploaded. The next step would start here.</p> : <VideoFlow {...props} />}
    </div>
  );
}
