"use client";

import { useEffect, useSyncExternalStore } from "react";
import { EMPTY_RECORDS, ensureRecordsLoaded, getRecordsState, subscribeRecords, type RecordsState } from "./store";

/** Subscribes to the shared project cache and loads it on first use. */
export function useRecordsState(): RecordsState {
  const s = useSyncExternalStore(subscribeRecords, getRecordsState, () => EMPTY_RECORDS);
  useEffect(() => {
    void ensureRecordsLoaded();
  }, []);
  return s;
}
