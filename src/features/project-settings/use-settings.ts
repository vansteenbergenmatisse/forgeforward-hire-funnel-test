"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe, updateSettings } from "./store";
import type { SettingsData, SettingsSnapshot } from "./types";

export type SettingsApi = {
  slug: string;
  data: SettingsData;
  savedAt: SettingsSnapshot["savedAt"];
  update: (recipe: (data: SettingsData) => SettingsData) => void;
};

/** Reads one project's settings and exposes an `update` that persists and marks "Saved". */
export function useSettings(slug: string): SettingsApi {
  const snap = useSyncExternalStore(
    subscribe,
    () => getSnapshot(slug),
    () => getServerSnapshot(slug),
  );
  const update = useCallback((recipe: (data: SettingsData) => SettingsData) => updateSettings(slug, recipe), [slug]);
  return { slug, data: snap.data, savedAt: snap.savedAt, update };
}
