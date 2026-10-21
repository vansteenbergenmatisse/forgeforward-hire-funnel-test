"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { StageColor, StageDef, StageRole } from "@/features/projects";
import { cn } from "@/shared/cn";
import { ROLES, ROLE_LABEL, validateStageName } from "../logic/stages";
import { ColorPicker } from "./color-picker";
import { Toggle } from "./dense";
import { SortableRow } from "./sortable-list";

export const STAGE_GRID = "grid grid-cols-[32px_32px_minmax(160px,1fr)_250px_170px_40px] items-center gap-3";

export function StageRow({
  stage,
  stages,
  autoFocus,
  onRename,
  onRecolor,
  onPositive,
  onRole,
  onDelete,
}: {
  stage: StageDef;
  stages: StageDef[];
  autoFocus: boolean;
  onRename: (name: string) => void;
  onRecolor: (c: StageColor) => void;
  onPositive: (v: boolean) => void;
  onRole: (r: StageRole) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(stage.name);
  const [touched, setTouched] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) {
      input.current?.focus();
      input.current?.select();
    }
  }, [autoFocus]);

  const error = touched ? validateStageName(stages, stage.id, name) : null;
  const errorId = `stage-err-${stage.id}`;

  return (
    <SortableRow id={stage.id} handleLabel={`Drag ${stage.name} to reorder`} className="border-t border-line first:border-t-0">
      {(handle) => (
        <div className={cn(STAGE_GRID, "py-2.5")}>
          {handle}
          <ColorPicker value={stage.color} stageName={stage.name} onChange={onRecolor} />
          <div>
            <input
              ref={input}
              aria-label={`Name of stage ${stage.name}`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!validateStageName(stages, stage.id, e.target.value)) onRename(e.target.value.trim());
              }}
              onBlur={() => setTouched(true)}
              className={cn("h-9 w-full rounded-lg border bg-white px-3 text-[14.5px] focus:border-charcoal focus:outline-none", error ? "border-signal bg-signal-tint/40" : "border-line-strong")}
            />
            {error && (
              <p id={errorId} role="alert" className="mt-1 text-[13px] font-semibold text-signal-deep">
                {error} The saved name stays {stage.name}.
              </p>
            )}
          </div>
          <select
            aria-label={`Role for ${stage.name}`}
            value={stage.role ?? "none"}
            onChange={(e) => onRole(e.target.value === "none" ? null : (e.target.value as StageRole))}
            className="h-9 rounded-lg border border-line-strong bg-white px-2.5 text-[13.5px] font-semibold focus:border-charcoal focus:outline-none"
          >
            <option value="none" disabled={!!stage.role}>
              No role
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2.5">
            <Toggle checked={stage.isPositive} label={`Keep videos for ${stage.name}`} onChange={onPositive} />
            <span className="text-[13.5px] font-bold">{stage.isPositive ? "Keep videos" : "Normal retention"}</span>
          </div>
          <button
            type="button"
            aria-label={stage.role ? `Delete ${stage.name} (blocked, it holds a role)` : `Delete ${stage.name}`}
            aria-disabled={stage.role ? true : undefined}
            title={stage.role ? "Move the role to another stage first" : undefined}
            onClick={onDelete}
            className={cn("grid size-8 place-items-center rounded-md hover:bg-sand", stage.role ? "text-placeholder" : "text-muted hover:text-signal-deep")}
          >
            <Trash2 className="size-[18px]" aria-hidden />
          </button>
        </div>
      )}
    </SortableRow>
  );
}
