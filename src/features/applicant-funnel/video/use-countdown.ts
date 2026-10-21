"use client";

import { useEffect, useRef, useState } from "react";

/** Counts down whole seconds from `total` on the wall clock. Calls `onZero` once. Restarts when `runKey` changes. */
export function useCountdown(total: number, onZero: () => void, runKey: number | string = 0): { left: number; skip: () => void } {
  const [left, setLeft] = useState(total);
  const zeroRef = useRef(onZero);
  const doneRef = useRef(false);
  useEffect(() => {
    zeroRef.current = onZero;
  });

  useEffect(() => {
    doneRef.current = false;
    const deadline = Date.now() + total * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0 && !doneRef.current) {
        doneRef.current = true;
        clearInterval(id);
        zeroRef.current();
      }
    }, 200);
    return () => clearInterval(id);
  }, [total, runKey]);

  return { left, skip: () => {
    if (doneRef.current) return;
    doneRef.current = true;
    zeroRef.current();
  } };
}
