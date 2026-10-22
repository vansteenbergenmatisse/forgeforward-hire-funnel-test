import { adminFetch, getBaseline, getRecord, renameCachedSlug, setBaseline, setMeta } from "@/features/projects/client";
import type { ProjectBundle } from "@/features/projects";
import { planSync } from "./sync-plan";

const DEBOUNCE_MS = 400;
const MAX_PASSES = 3;

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const chains = new Map<string, Promise<void>>();
const moves = new Map<string, Map<string, string>>();

const bundleOf = (slug: string): ProjectBundle | null => {
  const r = getRecord(slug);
  return r ? { def: r.def, questions: r.questions, stages: r.stages, templates: r.templates } : null;
};

/** Remembers where the cards of a stage go when that stage is deleted in the same edit. */
export function noteStageMove(slug: string, from: string, to: string) {
  const m = moves.get(slug) ?? new Map<string, string>();
  m.set(from, to);
  moves.set(slug, m);
}

async function runOnce(slug: string, keepalive: boolean): Promise<void> {
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let base = getBaseline(slug);
    const local = bundleOf(slug);
    if (!base || !local) return;
    const ops = planSync(base, local, moves.get(slug));
    if (ops.length === 0) return;
    for (const op of ops) {
      try {
        await adminFetch(op.method, op.path, op.body, { keepalive });
      } catch (e) {
        setMeta(slug, { error: e instanceof Error ? e.message : "Could not save." });
        return;
      }
      base = op.apply(base);
      setBaseline(slug, base);
      if (op.method === "DELETE") moves.get(slug)?.delete(op.path.split("/").pop()?.split("?")[0] ?? "");
    }
    setMeta(slug, { savedAt: Date.now(), error: null });
  }
}

/** Sends every valid pending edit for a project. Runs one at a time per project. */
export function flushSync(slug: string, keepalive = false): Promise<void> {
  const t = timers.get(slug);
  if (t) clearTimeout(t);
  timers.delete(slug);
  const next = (chains.get(slug) ?? Promise.resolve()).then(() => runOnce(slug, keepalive));
  chains.set(slug, next);
  return next;
}

/** Edits save as you type: wait for a short pause, then sync. */
export function scheduleSync(slug: string) {
  const t = timers.get(slug);
  if (t) clearTimeout(t);
  timers.set(slug, setTimeout(() => void flushSync(slug), DEBOUNCE_MS));
}

/** Saves everything pending, for when the tab is hidden or closed. */
export function flushAllPending() {
  for (const slug of [...timers.keys()]) void flushSync(slug, true);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushAllPending);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAllPending();
  });
}

/**
 * Changes the project's slug in the database, the one place every screen and shared link reads it from.
 * Pending edits go out first so they use the old slug. Resolves with an error message when the server refuses.
 */
export async function changeSlug(oldSlug: string, newSlug: string): Promise<{ ok: true } | { ok: false; message: string }> {
  await flushSync(oldSlug);
  try {
    await adminFetch("PATCH", `/api/admin/settings/${oldSlug}`, { slug: newSlug });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not change the slug." };
  }
  const m = moves.get(oldSlug);
  if (m) {
    moves.delete(oldSlug);
    moves.set(newSlug, m);
  }
  renameCachedSlug(oldSlug, newSlug);
  return { ok: true };
}
