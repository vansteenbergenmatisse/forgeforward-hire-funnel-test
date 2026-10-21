"use client";

import { useCallback, useRef } from "react";
import { insertAtCursor } from "../logic/templates";

/** Keeps a textarea ref and inserts a token at its caret (or over its selection), then restores focus. */
export function useCursorInsert(getValue: () => string, setValue: (next: string) => void) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const insert = useCallback(
    (token: string) => {
      const el = ref.current;
      const current = getValue();
      const start = el?.selectionStart ?? current.length;
      const end = el?.selectionEnd ?? current.length;
      const { text, caret } = insertAtCursor(current, token, start, end);
      setValue(text);
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(caret, caret);
      });
    },
    [getValue, setValue],
  );
  return { ref, insert };
}

/** Clickable variable chips. Native buttons, so keyboard and screen readers work. */
export function VariableChips({ variables, onInsert, label = "Tap to add a variable" }: { variables: readonly string[]; onInsert: (token: string) => void; label?: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[13px] text-subtle">{label}</span>
      {variables.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onInsert(`{${v}}`)}
          className="h-7 rounded-md border border-line-strong bg-white px-2 font-mono text-[12.5px] font-semibold text-charcoal hover:bg-sand"
        >
          {`{${v}}`}
        </button>
      ))}
    </div>
  );
}
