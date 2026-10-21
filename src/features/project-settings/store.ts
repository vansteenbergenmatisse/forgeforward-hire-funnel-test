import { seedSettings } from "./seed";
import type { SettingsData, SettingsSnapshot } from "./types";

const KEY = (slug: string) => `forge-hire.settings.v1.${slug}`;

const clientCache = new Map<string, SettingsSnapshot>();
const serverCache = new Map<string, SettingsSnapshot>();
const listeners = new Set<() => void>();

function load(slug: string): SettingsSnapshot {
  try {
    const raw = window.localStorage.getItem(KEY(slug));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SettingsData>;
      const seed = seedSettings(slug);
      if (parsed.project && parsed.questions && parsed.stages && parsed.templates) {
        return { data: { ...seed, ...parsed } as SettingsData, savedAt: null };
      }
    }
  } catch {
    // Storage blocked or corrupt: fall back to the seed.
  }
  return { data: seedSettings(slug), savedAt: null };
}

function persist(slug: string, data: SettingsData) {
  try {
    window.localStorage.setItem(KEY(slug), JSON.stringify(data));
  } catch {
    // Private window or full storage: the in-memory store still works.
  }
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  listeners.forEach((l) => l());
}

export function getSnapshot(slug: string): SettingsSnapshot {
  let snap = clientCache.get(slug);
  if (!snap) {
    snap = load(slug);
    clientCache.set(slug, snap);
  }
  return snap;
}

export function getServerSnapshot(slug: string): SettingsSnapshot {
  let snap = serverCache.get(slug);
  if (!snap) {
    snap = { data: seedSettings(slug), savedAt: null };
    serverCache.set(slug, snap);
  }
  return snap;
}

/** Applies an edit, persists it and marks the store as saved. */
export function updateSettings(slug: string, recipe: (data: SettingsData) => SettingsData) {
  const current = getSnapshot(slug);
  const data = recipe(current.data);
  if (data === current.data) return;
  clientCache.set(slug, { data, savedAt: Date.now() });
  persist(slug, data);
  emit();
}

/** Moves a project's settings to a new slug. The caller navigates to the new URL afterwards. */
export function renameSettingsSlug(oldSlug: string, newSlug: string) {
  const data = getSnapshot(oldSlug).data;
  const next: SettingsData = { ...data, project: { ...data.project, slug: newSlug } };
  clientCache.set(newSlug, { data: next, savedAt: Date.now() });
  persist(newSlug, next);
  clientCache.delete(oldSlug);
  try {
    window.localStorage.removeItem(KEY(oldSlug));
  } catch {
    // Ignore.
  }
  emit();
}

/** Test and demo helper: forget everything for a slug. */
export function resetSettings(slug: string) {
  clientCache.delete(slug);
  try {
    window.localStorage.removeItem(KEY(slug));
  } catch {
    // Ignore.
  }
  emit();
}
