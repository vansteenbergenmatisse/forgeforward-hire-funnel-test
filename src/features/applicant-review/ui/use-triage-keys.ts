"use client";

import { useEffect, useRef } from "react";

type Handlers = { onReject?: () => void; onGood?: () => void };

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Left arrow rejects, right arrow keeps as a good profile. Off while `enabled` is false, while typing, or with a modifier key held. */
export function useTriageKeys(enabled: boolean, handlers: Handlers) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // A held key must not run through the whole list.
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || isTyping(e.target)) return;
      e.preventDefault();
      if (e.key === "ArrowLeft") ref.current.onReject?.();
      else ref.current.onGood?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled]);
}
