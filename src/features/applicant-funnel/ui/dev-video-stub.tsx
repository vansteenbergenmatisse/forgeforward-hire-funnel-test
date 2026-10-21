"use client";

import { MainButton, StepBody, StepFooter } from "@/components/funnel";
import type { VideoFlowProps } from "../types";

/** Stand-in for the real VideoFlow while it is not available. Never shown in production builds. */
export function DevVideoStub({ onUploaded }: VideoFlowProps) {
  return (
    <>
      <StepBody>
        <p className="text-base text-muted">Dev stub for the video step.</p>
      </StepBody>
      <StepFooter>
        <MainButton onClick={onUploaded}>Pretend the video uploaded</MainButton>
      </StepFooter>
    </>
  );
}
