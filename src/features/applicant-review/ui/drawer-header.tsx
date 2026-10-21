import { X } from "lucide-react";
import { Badge } from "@/components/ui";
import { localTimeLabel, type ApplicantView } from "@/features/applicants";
import type { StageDef } from "@/features/projects";
import { formatDay } from "../lib/format";
import { StagePicker } from "./stage-picker";

type Props = {
  a: ApplicantView;
  stages: StageDef[];
  onMove: (stageId: string) => void;
  onClose: () => void;
};

export function DrawerHeader({ a, stages, onMove, onClose }: Props) {
  const local = localTimeLabel(a.timezone);
  return (
    <header className="border-b border-line px-6 pb-4 pt-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="drawer-title" className="flex flex-wrap items-center gap-2 text-2xl leading-tight">
            {a.firstName} {a.lastName}
            <span className="rounded-md bg-gray-tint px-1.5 py-0.5 font-sans text-xs font-bold tracking-wide text-gray" aria-label={`Country ${a.phoneCountry}`}>
              {a.phoneCountry}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            Applied {formatDay(a.createdAt)}{local && ` · ${local}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.didTask && <Badge tone="teal">Did task</Badge>}
            {a.audioOnly && <Badge tone="gray">Audio only</Badge>}
            {a.appliedBefore && <Badge tone="purple">Applied before</Badge>}
            {a.retakeUsed && <Badge tone="gray">Retake used</Badge>}
            {a.isTest && <Badge tone="amber">Test</Badge>}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close applicant" className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-sand">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="mt-4">
        <StagePicker a={a} stages={stages} onMove={onMove} />
      </div>
    </header>
  );
}
