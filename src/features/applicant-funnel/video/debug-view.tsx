"use client";

import type { FunnelProject, VideoFlowProps } from "../types";
import { IntroScreen, WorksScreen } from "./ui/check-screens";
import { DeniedScreen, HandoffScreen } from "./ui/denied-screens";
import { PrepScreen } from "./ui/prep-screens";
import { RecordScreen } from "./ui/record-screen";
import { ReviewScreen } from "./ui/review-screen";
import { UploadFailedScreen, UploadScreen } from "./ui/upload-screens";

const noop = () => {};
const fakeLink = () => Promise.resolve("forgeforward.io/a/appointment-setter?h=7Kq2...");

/** Renders each prototype screen with placeholder data. No camera needed. */
export function DebugView({ state, project }: { state: NonNullable<VideoFlowProps["debugState"]>; project: FunnelProject }) {
  switch (state) {
    case "A04":
      return <IntroScreen seconds={project.maxRecordSeconds} loading={false} onStart={noop} />;
    case "A05":
      return <WorksScreen stream={null} level={0.55} audioOnly={false} canSwitch onSwitch={noop} onContinue={noop} />;
    case "A06":
      return <WorksScreen stream={null} level={0.55} audioOnly canSwitch={false} onSwitch={noop} onContinue={noop} />;
    case "A07":
      return <DeniedScreen device="iphone" onRetry={noop} />;
    case "A08":
      return <HandoffScreen getLink={fakeLink} onTryAgain={noop} />;
    case "A09":
      return <PrepScreen prompt={project.videoPrompt} stream={null} audioOnly={false} secondsLeft={42} totalSeconds={project.prepSeconds} notice={null} onReady={noop} />;
    case "A10":
      return <RecordScreen prompt={project.videoPrompt} stream={null} audioOnly={false} elapsed={18} max={project.maxRecordSeconds} unlockIn={0} onFinish={noop} />;
    case "A11":
      return <ReviewScreen src={null} audioOnly={false} seconds={54} retakesLeft={1} onUse={noop} onRetake={noop} />;
    case "A12":
      return <UploadScreen percent={64} />;
    case "A13":
      return <UploadFailedScreen onRetry={noop} />;
  }
}
