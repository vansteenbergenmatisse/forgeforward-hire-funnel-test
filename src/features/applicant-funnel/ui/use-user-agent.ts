import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Browser user agent. Empty string during server render, so markup matches on hydration. */
export function useUserAgent(): string {
  return useSyncExternalStore(subscribe, () => navigator.userAgent, () => "");
}

/** Browser locale such as en-US. Empty on the server. */
export function useBrowserLocale(): string {
  return useSyncExternalStore(subscribe, () => navigator.language, () => "");
}
