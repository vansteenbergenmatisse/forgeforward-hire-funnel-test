import type { FunnelSession } from "../types";

export type FlowStep = "loading" | "closed" | "inapp" | "form" | "video" | "task" | "done";

export type FlowState = {
  step: FlowStep;
  session: FunnelSession | null;
  firstName: string;
  /** User chose "Continue here anyway" or is not in an in-app browser. */
  inAppBrowser: boolean;
};

export type FlowAction =
  | { type: "hydrate"; step: FlowStep; session: FunnelSession | null; firstName: string; inAppBrowser: boolean }
  | { type: "continueAnyway" }
  | { type: "formDone"; session: FunnelSession; firstName: string }
  | { type: "videoDone"; taskEnabled: boolean }
  | { type: "taskDone" };

export const initialFlowState: FlowState = { step: "loading", session: null, firstName: "", inAppBrowser: false };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "hydrate":
      return { step: action.step, session: action.session, firstName: action.firstName, inAppBrowser: action.inAppBrowser };
    case "continueAnyway":
      return state.step === "inapp" ? { ...state, step: "form" } : state;
    case "formDone":
      return state.step === "form" ? { ...state, step: "video", session: action.session, firstName: action.firstName } : state;
    case "videoDone":
      return state.step === "video" ? { ...state, step: action.taskEnabled ? "task" : "done" } : state;
    case "taskDone":
      return state.step === "task" ? { ...state, step: "done" } : state;
  }
}

/** 1 to 4, for the Details / Video / Task / Done progress bar. */
export function progressIndex(step: FlowStep): number {
  switch (step) {
    case "video":
      return 2;
    case "task":
      return 3;
    case "done":
      return 4;
    default:
      return 1;
  }
}
