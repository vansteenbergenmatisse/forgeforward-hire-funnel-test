import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import type { DeleteStep } from "../use-test-console";
import type { TestDataCounts } from "../types";

type Props = {
  counts: TestDataCounts | null;
  step: DeleteStep;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function TestDataCard({ counts, step, onAsk, onCancel, onConfirm }: Props) {
  const empty = counts !== null && counts.rows === 0 && counts.files === 0;
  return (
    <section aria-labelledby="data-title" className="rounded-[14px] border border-line bg-white px-5 py-[18px]">
      <h2 id="data-title" className="font-sans! text-base! font-extrabold! normal-case! leading-normal! tracking-normal!">
        Test data
      </h2>
      <p className="mb-3 mt-1 text-[13.5px] text-muted" aria-live="polite">
        {counts === null
          ? "Counting test data."
          : empty
            ? "0 left. No test applicants or files remain."
            : `${plural(counts.rows, "test applicant", "test applicants")} and ${plural(counts.files, "file", "files")} in R2. Test data never shows on the board.`}
      </p>
      {step === "confirm" && counts && !empty ? (
        <div role="group" aria-label="Confirm delete" className="rounded-lg border border-signal bg-signal-tint p-3">
          <p className="text-[13.5px] font-semibold text-signal-deep">
            Delete {plural(counts.rows, "applicant", "applicants")} and {plural(counts.files, "file", "files")}? This cannot be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" size="sm" onClick={onConfirm} autoFocus>
              Yes, delete test data
            </Button>
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          onClick={onAsk}
          disabled={counts === null || empty || step === "deleting"}
          icon={step === "deleting" ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
        >
          {step === "deleting" ? "Deleting" : "Delete test data"}
        </Button>
      )}
    </section>
  );
}
