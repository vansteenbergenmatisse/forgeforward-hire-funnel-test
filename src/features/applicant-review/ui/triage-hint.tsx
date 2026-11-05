import { ArrowLeft, ArrowRight } from "lucide-react";

/** Strip under the header while triage keys are live. A key with no target stage says so instead of doing nothing silently. */
export function TriageHint({ rejectAvailable, goodAvailable }: { rejectAvailable: boolean; goodAvailable: boolean }) {
  return (
    <p className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-line bg-sand px-6 py-2 text-[12.5px] font-semibold text-charcoal" aria-live="polite">
      {rejectAvailable ? (
        <span className="inline-flex items-center gap-1.5">
          <ArrowLeft className="size-3.5" aria-hidden />
          Reject
        </span>
      ) : (
        <span className="text-muted">No Rejected stage in this project, so the left arrow does nothing.</span>
      )}
      {goodAvailable ? (
        <span className="inline-flex items-center gap-1.5">
          <ArrowRight className="size-3.5" aria-hidden />
          Good profile
        </span>
      ) : (
        <span className="text-muted">No &quot;Good profile&quot; stage in this project, so the right arrow does nothing.</span>
      )}
    </p>
  );
}
