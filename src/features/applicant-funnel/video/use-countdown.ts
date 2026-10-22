"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts down whole seconds from `total`. Calls `onZero` once. Restarts when `runKey` changes.
 * Time only counts while the tab is visible, so prep and the 3, 2, 1 never finish in the background
 * and recording never starts on a hidden page.
 */
export function useCountdown(total: number, onZero: () => void, runKey: number | string = 0): { left: number; skip: () => void } {
  const [left, setLeft] = useState(total);
  const zeroRef = useRef(onZero);
  const doneRef = useRef(false);
  useEffect(() => {
    zeroRef.current = onZero;
  });

  useEffect(() => {
    doneRef.current = false;
    let remainingMs = total * 1000;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      if (!document.hidden) remainingMs -= now - last;
      last = now;
      const remaining = Math.max(0, Math.ceil(remainingMs / 1000));
      setLeft(remaining);
      if (remainingMs <= 0 && !document.hidden && !doneRef.current) {
        doneRef.current = true;
        clearInterval(id);
        zeroRef.current();
      }
    };
    // Restart the clock from the moment the tab is visible again, not from the last tick.
    const onVisibility = () => {
      last = Date.now();
    };
    const id = setInterval(tick, 200);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [total, runKey]);

  return { left, skip: () => {
    if (doneRef.current) return;
    doneRef.current = true;
    zeroRef.current();
  } };
}
