"use client";

import { useMemo, useSyncExternalStore } from "react";
import { MOCK_NOW } from "@/features/applicants";

const MINUTE = 60_000;
const SERVER_MINUTE = Math.floor(MOCK_NOW.getTime() / MINUTE);

function subscribe(onChange: () => void) {
  const t = setInterval(onChange, MINUTE);
  return () => clearInterval(t);
}

/** The current time, refreshed every minute. The server and the first client render use the fixture time so hydration matches. */
export function useNow(): Date {
  const minute = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / MINUTE),
    () => SERVER_MINUTE,
  );
  return useMemo(() => new Date(minute * MINUTE), [minute]);
}
