"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved";

/** Debounced save. Pending text is flushed when the component unmounts so closing the drawer never loses a note. */
export function useAutosave(initial: string, save: (value: string) => void, delay = 600) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<string | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current === null) return;
    saveRef.current(pending.current);
    pending.current = null;
    setState("saved");
  }, []);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current !== null) saveRef.current(pending.current);
    },
    [],
  );

  const change = (next: string) => {
    setValue(next);
    pending.current = next;
    setState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  };

  return { value, state, change, flush };
}
