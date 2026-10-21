"use client";

import { useState } from "react";
import { FunnelShell } from "@/components/funnel";
import { getFunnelApi, type MockSim } from "../api";
import type { DevStep } from "../lib/dev-step";
import type { FormValues } from "../lib/form-validation";
import type { FunnelProject, FunnelSession, VideoFlowProps } from "../types";
import { DetailsForm } from "./details-form";
import { InAppScreen } from "./in-app-screen";
import { TaskStep } from "./task-step";
import { ThankYou } from "./thank-you";
import { VideoStep } from "./video-step";

const SESSION: FunnelSession = { applicantId: "dev-applicant", resumeToken: "dev-token" };
const SAMPLE: FormValues = {
  firstName: "Sam",
  lastName: "",
  email: "sam@gmail",
  phone: "555 12",
  country: "US",
  whatsappOk: true,
  timezone: "America/New_York",
  answers: { "q-years": "3 to 5 years" },
  consent: true,
};
const EMPTY: FormValues = { ...SAMPLE, firstName: "", email: "", phone: "", whatsappOk: null, answers: {}, consent: false };

/** Review helper: renders a prototype screen with sample data. Mounted only outside production. */
export function DevReview({ step, project, tracking, sim }: { step: DevStep; project: FunnelProject; tracking: Record<string, string>; sim: MockSim }) {
  const [api] = useState(() => getFunnelApi(sim));
  const noop = () => {};
  const n = Number(step.slice(1));

  if (n >= 4 && n <= 13) {
    return (
      <FunnelShell step={2}>
        <VideoStep project={project} session={SESSION} api={api} inAppBrowser={false} onUploaded={noop} debugState={step as NonNullable<VideoFlowProps["debugState"]>} />
      </FunnelShell>
    );
  }
  switch (step) {
    case "A01":
      return (
        <FunnelShell step={1}>
          <InAppScreen onContinue={noop} pageUrl="https://hire.example.com/a/appointment-setter" />
        </FunnelShell>
      );
    case "A02":
    case "A03":
      return (
        <FunnelShell step={1}>
          <DetailsForm project={project} api={api} tracking={tracking} inAppBrowser={false} initial={step === "A03" ? SAMPLE : EMPTY} showErrorsOnMount={step === "A03"} onDone={noop} />
        </FunnelShell>
      );
    case "A14":
    case "A15":
      return (
        <FunnelShell step={3}>
          <TaskStep project={project} session={SESSION} api={api} initial={{ askSkip: step === "A15" }} onDone={noop} />
        </FunnelShell>
      );
    default:
      return (
        <FunnelShell step={4}>
          <ThankYou text={project.thankYouText} firstName="Sam" replyDays={project.replyDays} />
        </FunnelShell>
      );
  }
}
