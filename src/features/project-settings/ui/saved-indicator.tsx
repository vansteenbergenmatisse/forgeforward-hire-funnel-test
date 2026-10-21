import { Check } from "lucide-react";

/** Header status. Changes save as the user types, so this confirms rather than asks. */
export function SavedIndicator({ savedAt }: { savedAt: number | null }) {
  return (
    <p role="status" aria-live="polite" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-bold">
      {savedAt ? (
        <>
          <Check className="size-4 text-ok" aria-hidden />
          <span className="text-ok">Saved</span>
        </>
      ) : (
        <span className="font-semibold text-subtle">Changes save as you type</span>
      )}
    </p>
  );
}
