import type { FlowStep } from "./flow-reducer";
import type { FunnelSession } from "../types";

export type SavedFlow = {
  step: Exclude<FlowStep, "loading" | "inapp">;
  session: FunnelSession | null;
  firstName: string;
  inAppBrowser: boolean;
  /** When the flow was saved. A finished application shows its thank you page for a day, then the form returns. */
  savedAt?: number;
};

const key = (slug: string) => `ff:funnel:${slug}`;

/** How long a reload keeps showing the thank you page after the person finished. */
export const DONE_TTL_MS = 24 * 60 * 60_000;

export function isDoneExpired(savedAt: number | undefined, now = Date.now()): boolean {
  return typeof savedAt !== "number" || now - savedAt > DONE_TTL_MS;
}

/** Where the server says the applicant stands, as a funnel screen. Used when a handoff link opens in a new browser. */
export function stepForServerProgress(funnelStep: string | undefined, taskEnabled: boolean): "video" | "task" | "done" {
  if (funnelStep === "completed") return "done";
  if (funnelStep === "video_done") return taskEnabled ? "task" : "done";
  return "video";
}

export function loadFlow(slug: string): SavedFlow | null {
  try {
    const raw = window.localStorage.getItem(key(slug));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<SavedFlow>;
    const steps = ["form", "video", "task", "done"];
    if (!v.step || !steps.includes(v.step)) return null;
    if (v.step !== "form" && !v.session?.resumeToken) return null;
    if (v.step === "done" && isDoneExpired(v.savedAt)) {
      clearFlow(slug);
      return null;
    }
    return { step: v.step, session: v.session ?? null, firstName: v.firstName ?? "", inAppBrowser: Boolean(v.inAppBrowser), savedAt: v.savedAt };
  } catch {
    return null;
  }
}

export function saveFlow(slug: string, flow: SavedFlow): void {
  try {
    // Once finished, keep the first finish time so reloads do not extend the day.
    const existing = flow.step === "done" ? loadFlowRaw(slug) : null;
    const savedAt = existing?.step === "done" && typeof existing.savedAt === "number" ? existing.savedAt : Date.now();
    window.localStorage.setItem(key(slug), JSON.stringify({ ...flow, savedAt }));
  } catch {
    /* storage blocked: the flow still works, it just will not survive a refresh */
  }
}

function loadFlowRaw(slug: string): Partial<SavedFlow> | null {
  try {
    const raw = window.localStorage.getItem(key(slug));
    return raw ? (JSON.parse(raw) as Partial<SavedFlow>) : null;
  } catch {
    return null;
  }
}

export function clearFlow(slug: string): void {
  try {
    window.localStorage.removeItem(key(slug));
  } catch {
    /* ignore */
  }
}
