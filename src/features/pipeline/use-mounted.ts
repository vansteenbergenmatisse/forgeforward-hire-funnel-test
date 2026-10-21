"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False on the server and during hydration, true afterwards. Lets a screen wait for browser-only stores before it says "not found". */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
