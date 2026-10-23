"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CheckCircle2 } from "lucide-react";

// One short confirmation at a time, with an optional Undo. Lives outside React so a card that moves in the list keeps its message.

type Toast = { id: number; text: string; undo?: () => void };

let current: Toast | null = null;
let counter = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

function set(next: Toast | null) {
  current = next;
  listeners.forEach((l) => l());
}

export const showToast = (text: string, undo?: () => void) => set({ id: ++counter, text, undo });
export const hideToast = () => set(null);

const SHOW_MS = 8000;

/** Mount once per screen that can deactivate, reactivate or delete a project. */
export function LifecycleToaster() {
  const toast = useSyncExternalStore(subscribe, () => current, () => null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => (current?.id === toast.id ? hideToast() : undefined), SHOW_MS);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-charcoal px-4 py-3 text-sm font-semibold text-white shadow-lift">
      <CheckCircle2 className="size-5 shrink-0 text-ok-tint" aria-hidden />
      <span className="min-w-0 flex-1">{toast.text}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            const undo = toast.undo;
            hideToast();
            undo?.();
          }}
          className="inline-flex h-12 items-center rounded-md px-3 font-extrabold underline underline-offset-2 hover:bg-white/10"
        >
          Undo
        </button>
      )}
    </div>
  );
}
