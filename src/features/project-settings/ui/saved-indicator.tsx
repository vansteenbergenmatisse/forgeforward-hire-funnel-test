import { AlertCircle, Check } from "lucide-react";

/** Header status. Changes save as the user types, so this confirms rather than asks. */
export function SavedIndicator({ savedAt, error }: { savedAt: number | null; error?: string | null }) {
  if (error) {
    return (
      <p role="alert" className="inline-flex h-10 max-w-md items-center gap-1.5 rounded-lg px-3 text-sm font-bold text-signal-deep">
        <AlertCircle className="size-4 shrink-0" aria-hidden />
        <span className="truncate" title={error}>
          Not saved. {error}
        </span>
      </p>
    );
  }
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
