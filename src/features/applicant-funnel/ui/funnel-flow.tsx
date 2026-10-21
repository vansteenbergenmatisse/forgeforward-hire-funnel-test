"use client";

import { useEffect, useReducer, useState } from "react";
import { FunnelShell } from "@/components/funnel";
import { getFunnelApi, type MockSim } from "../api";
import { flowReducer, initialFlowState, progressIndex } from "../state/flow-reducer";
import { clearFlow, loadFlow, saveFlow } from "../state/persistence";
import { detectInAppBrowser } from "../lib/in-app";
import type { FunnelProject } from "../types";
import { DetailsForm } from "./details-form";
import { FunnelNotice } from "./funnel-notice";
import { FunnelSkeleton } from "./funnel-skeleton";
import { InAppScreen } from "./in-app-screen";
import { blankFormValues } from "./initial-values";
import { TaskStep } from "./task-step";
import { ThankYou } from "./thank-you";
import { useBrowserLocale } from "./use-user-agent";
import { VideoStep } from "./video-step";

/** The whole applicant journey: in-app check, details, video, task, thank you. Refresh keeps the place. */
export function FunnelFlow({ project, tracking, sim, videoStub }: { project: FunnelProject; tracking: Record<string, string>; sim: MockSim; videoStub?: boolean }) {
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);
  const [api] = useState(() => getFunnelApi(sim));
  const locale = useBrowserLocale();
  const slug = project.slug;

  useEffect(() => {
    const saved = loadFlow(slug);
    if (project.status === "closed" && !saved?.session) {
      dispatch({ type: "hydrate", step: "closed", session: null, firstName: "", inAppBrowser: false });
      return;
    }
    if (saved) {
      dispatch({ type: "hydrate", step: saved.step, session: saved.session, firstName: saved.firstName, inAppBrowser: saved.inAppBrowser });
      return;
    }
    const inApp = detectInAppBrowser(navigator.userAgent);
    dispatch({ type: "hydrate", step: inApp ? "inapp" : "form", session: null, firstName: "", inAppBrowser: inApp });
  }, [slug, project.status]);

  useEffect(() => {
    if (state.step === "done") clearFlow(slug);
    else if (state.step === "form" || state.step === "video" || state.step === "task") {
      saveFlow(slug, { step: state.step, session: state.session, firstName: state.firstName, inAppBrowser: state.inAppBrowser });
    }
  }, [slug, state]);

  const { step, session } = state;
  if (step === "closed") return <FunnelNotice title="Applications for this role are closed." />;

  return (
    <FunnelShell step={progressIndex(step)}>
      {step === "loading" && <FunnelSkeleton />}
      {step === "inapp" && <InAppScreen onContinue={() => dispatch({ type: "continueAnyway" })} />}
      {step === "form" && (
        <DetailsForm
          project={project}
          api={api}
          tracking={tracking}
          inAppBrowser={state.inAppBrowser}
          initial={blankFormValues(locale)}
          onDone={(s, firstName) => dispatch({ type: "formDone", session: s, firstName })}
        />
      )}
      {step === "video" && session && (
        <VideoStep
          project={project}
          session={session}
          api={api}
          inAppBrowser={state.inAppBrowser}
          useStub={videoStub}
          onUploaded={() => dispatch({ type: "videoDone", taskEnabled: project.taskEnabled })}
        />
      )}
      {step === "task" && session && <TaskStep project={project} session={session} api={api} onDone={() => dispatch({ type: "taskDone" })} />}
      {step === "done" && <ThankYou text={project.thankYouText} firstName={state.firstName} replyDays={project.replyDays} />}
    </FunnelShell>
  );
}
