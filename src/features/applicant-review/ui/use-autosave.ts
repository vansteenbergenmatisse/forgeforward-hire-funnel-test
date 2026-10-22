"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced save. Pending text is flushed when the component unmounts so closing the drawer never loses a note.
 * `save` may return a promise of true/false. "saved" shows only after the server kept the text; false or a rejection shows "error".
 */
export function useAutosave(initial: string, save: (value: string) => Promise<boolean> | void, delay = 600) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<string | null>(null);
  const lastSent = useRef(initial);
  const run = useRef(0);
  const mounted = useRef(true);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current === null) return;
    const text = pending.current;
    pending.current = null;
    lastSent.current = text;
    const mine = ++run.current;
    setState("saving");
    Promise.resolve(saveRef.current(text))
      .then((ok) => ok !== false, () => false)
      .then((ok) => {
        // A newer save or newer typing owns the indicator now.
        if (!mounted.current || run.current !== mine || pending.current !== null) return;
        setState(ok ? "saved" : "error");
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      if (pending.current !== null) void saveRef.current(pending.current);
    };
  }, []);

  const change = (next: string) => {
    setValue(next);
    pending.current = next;
    setState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  };

  /** Sends the last text again after a failed save. */
  const retry = () => {
    pending.current = pending.current ?? lastSent.current;
    flush();
  };

  return { value, state, change, flush, retry };
}
