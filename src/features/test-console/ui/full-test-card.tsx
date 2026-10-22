import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { CheckRowItem } from "./check-row";
import type { Summary } from "../summary";
import type { CheckRow } from "../types";

type Props = {
  rows: CheckRow[];
  summary: Summary;
  running: boolean;
  everRun: boolean;
  subtitle: string;
  simulateFailure: boolean;
  /** Only given for the simulated runner. The real runner has nothing to simulate. */
  onSimulateChange?: (v: boolean) => void;
  onRun: () => void;
};

export function FullTestCard({ rows, summary, running, everRun, subtitle, simulateFailure, onSimulateChange, onRun }: Props) {
  const rerun = everRun && !running;
  return (
    <section aria-labelledby="full-test-title" className="rounded-[14px] border border-line bg-white">
      <div className="flex items-center justify-between gap-4 p-4">
        <div>
          <h2 id="full-test-title" className="font-sans! text-base! font-extrabold! normal-case! leading-normal! tracking-normal!">
            Full test
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>
        </div>
        <Button variant="primary" onClick={onRun} loading={running} icon={rerun ? <RotateCcw className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}>
          {running ? "Running" : rerun ? "Run again" : "Run full test"}
        </Button>
      </div>
      <ol className="list-none">
        {rows.map((r, i) => (
          <CheckRowItem key={r.id} row={r} index={i} />
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        {onSimulateChange ? (
          <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
            <input
              type="checkbox"
              checked={simulateFailure}
              disabled={running}
              onChange={(e) => onSimulateChange(e.target.checked)}
              className="size-4 accent-signal"
            />
            Simulate a failure
            <span className="font-normal text-muted">(demo: check 12 fails)</span>
          </label>
        ) : (
          <span />
        )}
        {summary.done && (
          <p className="text-[13px] font-bold tabular-nums">
            {summary.passed} of {summary.total} passed
            {summary.failed > 0 && <span className="text-signal-deep">, {summary.failed} failed</span>}
          </p>
        )}
      </div>
    </section>
  );
}
