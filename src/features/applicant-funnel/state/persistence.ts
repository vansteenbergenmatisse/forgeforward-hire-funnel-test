import type { FlowStep } from "./flow-reducer";
import type { FunnelSession } from "../types";

export type SavedFlow = { step: Exclude<FlowStep, "loading" | "inapp">; session: FunnelSession | null; firstName: string; inAppBrowser: boolean };

const key = (slug: string) => `ff:funnel:${slug}`;

export function loadFlow(slug: string): SavedFlow | null {
  try {
    const raw = window.localStorage.getItem(key(slug));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<SavedFlow>;
    const steps = ["form", "video", "task", "done"];
    if (!v.step || !steps.includes(v.step)) return null;
    if (v.step !== "form" && !v.session?.resumeToken) return null;
    return { step: v.step, session: v.session ?? null, firstName: v.firstName ?? "", inAppBrowser: Boolean(v.inAppBrowser) };
  } catch {
    return null;
  }
}

export function saveFlow(slug: string, flow: SavedFlow): void {
  try {
    window.localStorage.setItem(key(slug), JSON.stringify(flow));
  } catch {
    /* storage blocked: the flow still works, it just will not survive a refresh */
  }
}

export function clearFlow(slug: string): void {
  try {
    window.localStorage.removeItem(key(slug));
  } catch {
    /* ignore */
  }
}
