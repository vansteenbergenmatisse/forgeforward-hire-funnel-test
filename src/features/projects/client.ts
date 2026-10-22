"use client";

// Client-only entrypoint of the projects feature: the shared project cache every admin screen reads.
export { useRecordsState } from "./client/hooks";
export { adminFetch, AdminApiError } from "./client/api";
export {
  EMPTY_RECORDS,
  createRemoteProject,
  ensureRecordsLoaded,
  getBaseline,
  getRecord,
  slugAlias,
  getRecordsState,
  metaFor,
  moveStageCount,
  refreshStageCounts,
  renameCachedSlug,
  resetRecords,
  setBaseline,
  setLocalBundle,
  setMeta,
  subscribeRecords,
} from "./client/store";
export type { RecordMeta, RecordsState } from "./client/store";
