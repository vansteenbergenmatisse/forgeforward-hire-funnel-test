"use client";

import { useCallback, useMemo } from "react";
import { BLANK_PROJECT_DEF } from "@/features/projects";
import { metaFor, slugAlias, useRecordsState } from "@/features/projects/client";
import { toSettings, updateSettings } from "./store";
import type { SettingsData, SettingsSnapshot } from "./types";

export type SettingsApi = {
  slug: string;
  data: SettingsData;
  savedAt: SettingsSnapshot["savedAt"];
  /** Set when the last save failed. The edit stays on screen and is retried on the next change. */
  error: string | null;
  status: "loading" | "ready" | "notfound" | "error";
  update: (recipe: (data: SettingsData) => SettingsData) => void;
};

function placeholder(slug: string): SettingsData {
  return { project: { ...BLANK_PROJECT_DEF, slug, name: "" }, questions: [], stages: [], templates: [] };
}

/** Reads one project's settings from the shared cache and exposes an `update` that saves and marks "Saved". */
export function useSettings(slug: string): SettingsApi {
  const s = useRecordsState();
  const alias = slugAlias(slug);
  const rec = s.records.find((r) => r.def.slug === slug) ?? (alias ? s.records.find((r) => r.def.slug === alias) : undefined);
  const data = useMemo(() => (rec ? toSettings(rec) : placeholder(slug)), [rec, slug]);
  const update = useCallback((recipe: (data: SettingsData) => SettingsData) => updateSettings(rec?.def.slug ?? slug, recipe), [rec?.def.slug, slug]);
  const meta = metaFor(s, rec?.def.slug ?? slug);
  const status = rec ? "ready" : s.status === "ready" ? "notfound" : s.status === "error" ? "error" : "loading";
  return { slug: rec?.def.slug ?? slug, data, savedAt: meta.savedAt, error: meta.error, status, update };
}
