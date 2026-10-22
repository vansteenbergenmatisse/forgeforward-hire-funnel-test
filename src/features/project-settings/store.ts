import { getRecord, setLocalBundle, type RecordsState, metaFor } from "@/features/projects/client";
import type { ProjectRecordDto } from "@/features/projects";
import { changeSlug, scheduleSync } from "./sync";
import type { SettingsData } from "./types";

export const toSettings = (r: ProjectRecordDto): SettingsData => ({ project: r.def, questions: r.questions, stages: r.stages, templates: r.templates });

/** Applies an edit to the shared project cache and schedules the save. The database stays the source of truth. */
export function updateSettings(slug: string, recipe: (data: SettingsData) => SettingsData) {
  const rec = getRecord(slug);
  if (!rec) return;
  const current = toSettings(rec);
  const data = recipe(current);
  if (data === current) return;
  setLocalBundle(slug, { def: { ...data.project, slug }, questions: data.questions, stages: data.stages, templates: data.templates });
  scheduleSync(slug);
}

/** Changes the slug in the database and every cache. The caller navigates to the new URL when this resolves ok. */
export const renameSettingsSlug = changeSlug;

export function settingsMeta(s: RecordsState, slug: string) {
  return metaFor(s, slug);
}
